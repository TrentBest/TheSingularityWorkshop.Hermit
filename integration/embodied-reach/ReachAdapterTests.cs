using System.Numerics;
using Hermit.EmbodiedReach;
using TheSingularityWorkshop.Gestures;
using Xunit;

namespace Hermit.EmbodiedReach.Tests;

public sealed class ReachAdapterTests
{
    private static readonly JointAngleLimits Limits = new(-MathF.PI / 2f, MathF.PI / 2f);

    [Fact]
    public void ComposesHalfErrorCorrectionsWithObservedAnglesBeforeGesturesAdvance()
    {
        var armature = Definition().CreateArmature();
        var observation = armature.Reset("reach-episode", 17);

        var result = ReachAdapter.Step(
            armature, observation,
            targetShoulderAngleRadians: 0.8,
            targetElbowAngleRadians: -0.4,
            maximumCorrectionRadiansPerStep: 0.1,
            deltaTimeSeconds: 0.1f);

        Assert.Equal(0.8, result.TargetShoulderAngleRadians, 10);
        Assert.Equal(-0.4, result.TargetElbowAngleRadians, 10);
        Assert.Equal(0.4, result.ShoulderErrorRadians, 5);
        Assert.Equal(-0.4, result.ElbowErrorRadians, 5);
        Assert.Equal(0.2, result.RawShoulderCorrectionRadians, 5);
        Assert.Equal(-0.2, result.RawElbowCorrectionRadians, 5);
        Assert.Equal(0.1, result.BoundedShoulderCorrectionRadians, 5);
        Assert.Equal(-0.1, result.BoundedElbowCorrectionRadians, 5);
        Assert.Equal(0.1f, result.RequestedShoulderTargetRadians, 5);
        Assert.Equal(-0.1f, result.RequestedElbowTargetRadians, 5);
        Assert.Equal(0.05f, result.AchievedShoulderAngleRadians, 5);
        Assert.Equal(-0.05f, result.AchievedElbowAngleRadians, 5);
        Assert.Equal(1, result.OutputStepIndex);
        Assert.Equal("hermit-reach-fixture", result.ScenarioId);
        Assert.Equal((ulong)17, result.Seed);
        Assert.Equal(0.1, result.MaximumCorrectionRadiansPerStep, 10);
        Assert.Equal(0.1f, result.DeltaTimeSeconds);
        Assert.Equal(1, armature.StepIndex);
    }

    [Fact]
    public void GesturesRangeClampAndSpeedLimitRemainAuthoritative()
    {
        var armature = Definition(initialShoulder: 1.4f, initialElbow: -1.4f, speed: 10f).CreateArmature();
        var observation = armature.Reset("bounded-episode", 3);

        var result = ReachAdapter.Step(
            armature, observation,
            targetShoulderAngleRadians: 10,
            targetElbowAngleRadians: -10,
            maximumCorrectionRadiansPerStep: 20,
            deltaTimeSeconds: 1f);

        Assert.Equal(Limits.MaximumRadians, result.GesturesAcceptedShoulderTargetRadians, 5);
        Assert.Equal(Limits.MinimumRadians, result.GesturesAcceptedElbowTargetRadians, 5);
        Assert.Equal(Limits.MaximumRadians, result.AchievedShoulderAngleRadians, 5);
        Assert.Equal(Limits.MinimumRadians, result.AchievedElbowAngleRadians, 5);
    }

    [Fact]
    public void TraceCaptureChangesEvidenceOnlyNotTheNumericalProposal()
    {
        var armature = Definition().CreateArmature();
        var observation = armature.Reset("trace-episode", 5);
        var withTrace = ReachAdapter.Step(armature, observation, 0.4, -0.2, 0.2, 0.1f, captureTrace: true);

        armature.Reset("trace-episode", 5);
        var withoutTrace = ReachAdapter.Step(armature, armature.Observe(), 0.4, -0.2, 0.2, 0.1f, captureTrace: false);

        Assert.Equal(withTrace.RawShoulderCorrectionRadians, withoutTrace.RawShoulderCorrectionRadians);
        Assert.Equal(withTrace.RawElbowCorrectionRadians, withoutTrace.RawElbowCorrectionRadians);
        Assert.Equal(withTrace.AchievedShoulderAngleRadians, withoutTrace.AchievedShoulderAngleRadians);
        Assert.Equal(withTrace.AchievedElbowAngleRadians, withoutTrace.AchievedElbowAngleRadians);
        Assert.Equal(new[] { "joint-errors", "joint-proposals" }, withTrace.TraceRecords.Select(item => item.NodeId));
        Assert.Equal(new[] { 0.2, -0.1 }, withTrace.TraceRecords[1].Values);
        Assert.Empty(withoutTrace.TraceRecords);
        Assert.True(withTrace.TraceCaptured);
        Assert.False(withoutTrace.TraceCaptured);
    }

    [Fact]
    public void RejectsStaleOrWrongVersionObservationBeforeMutation()
    {
        var armature = Definition().CreateArmature();
        var observation = armature.Reset("stale-episode", 9);
        var stale = observation with { StepIndex = 1 };
        Assert.Throws<InvalidOperationException>(() =>
            ReachAdapter.Step(armature, stale, 0.2, 0.2, 0.1, 0.1f));

        var wrongVersion = observation with { ContractVersion = 99 };
        Assert.Throws<ArgumentException>(() =>
            ReachAdapter.Step(armature, wrongVersion, 0.2, 0.2, 0.1, 0.1f));

        Assert.Equal(observation, armature.Observe());
        Assert.Equal(0, armature.StepIndex);
    }

    [Fact]
    public void RejectsNonFiniteTargetsAndInvalidBoundsBeforeMutation()
    {
        var armature = Definition().CreateArmature();
        var observation = armature.Reset("invalid-episode", 11);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            ReachAdapter.Step(armature, observation, double.NaN, 0, 0.1, 0.1f));
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            ReachAdapter.Step(armature, observation, 0, 0, 0, 0.1f));
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            ReachAdapter.Step(armature, observation, 0, 0, 0.1, float.NaN));

        Assert.Equal(observation, armature.Observe());
        Assert.Equal(0, armature.StepIndex);
    }

    [Fact]
    public void ReplaysTheSameEpisodeDeterministicallyAfterReset()
    {
        var armature = Definition().CreateArmature();
        var first = Run(armature);
        armature.Reset("replay", 123);
        var second = Run(armature);
        Assert.Equal(first, second);
    }

    private static (float Shoulder, float Elbow, float X, float Y)[] Run(StatefulPlanarArmature armature)
    {
        var records = new List<(float, float, float, float)>();
        var observation = armature.Reset("replay", 123);
        for (var i = 0; i < 5; i++)
        {
            var result = ReachAdapter.Step(
                armature, observation,
                targetShoulderAngleRadians: 0.7,
                targetElbowAngleRadians: -0.5,
                maximumCorrectionRadiansPerStep: 0.08,
                deltaTimeSeconds: 0.1f);
            records.Add((
                result.AchievedShoulderAngleRadians,
                result.AchievedElbowAngleRadians,
                result.AchievedEndEffectorX,
                result.AchievedEndEffectorY));
            observation = armature.Observe();
        }
        return records.ToArray();
    }

    private static PlanarArmatureDefinition Definition(
        float initialShoulder = 0,
        float initialElbow = 0,
        float speed = 0.5f) =>
        new(
            "hermit-reach-fixture",
            "shoulder-joint", "upper-arm",
            "elbow-joint", "forearm", "hand-tip",
            new Vector2(0, 0),
            1, 1,
            Limits, Limits,
            initialShoulder, initialElbow,
            speed, speed);
}
