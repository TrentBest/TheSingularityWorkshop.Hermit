using System.Diagnostics;
using FsmNeuralNetworks;
using TheSingularityWorkshop.Gestures;

namespace Hermit.EmbodiedReach;

/// <summary>
/// Consumer-owned adapter from measured Gestures joint angles to bounded neural proposals.
/// It does not add a runtime bridge to Hermit's JavaScript host.
/// </summary>
public static class ReachAdapter
{
    public const int AdapterSchemaVersion = 1;
    public const string ModelVersion = "planar-reach-proposal-v1";

    private const string InputNodeId = "joint-errors";
    private const string OutputKey = "joint-proposals.pre-activation";

    private static readonly EvaluationBudget Budget =
        new(8, 8, 64, 16, 16, 8, 32, TimeSpan.FromSeconds(1));

    // Matches the existing NeuralNetworks conformance fixture: a diagonal 0.5 correction map.
    // Outputs are corrections, not absolute joint targets or physical actuator commands.
    private static readonly NeuralGraph ProposalGraph = new(
        ModelVersion,
        [
            new InputNode(InputNodeId, 2),
            new DenseNode("joint-proposals", 2, 2, [0.5, 0, 0, 0.5], [0, 0])
        ],
        [new NeuralEdge(InputNodeId, "values", "joint-proposals", "values")]);

    /// <summary>
    /// Evaluates one stateless proposal and advances the supplied Gestures armature exactly once.
    /// Target angles and all safety bounds are supplied by this consumer, not inferred by the network.
    /// </summary>
    public static ReachStepEvidence Step(
        StatefulPlanarArmature armature,
        PlanarArmatureObservation observation,
        double targetShoulderAngleRadians,
        double targetElbowAngleRadians,
        double maximumCorrectionRadiansPerStep,
        float deltaTimeSeconds,
        bool captureTrace = true)
    {
        ArgumentNullException.ThrowIfNull(armature);

        var validationStarted = Stopwatch.GetTimestamp();
        if (observation.ContractVersion != StatefulPlanarArmature.CurrentContractVersion)
            throw new ArgumentException("Unsupported Gestures observation contract version.", nameof(observation));
        if (string.IsNullOrWhiteSpace(observation.EpisodeId) ||
            !StringComparer.Ordinal.Equals(observation.EpisodeId, armature.EpisodeId) ||
            observation.StepIndex != armature.StepIndex ||
            observation != armature.Observe())
            throw new InvalidOperationException("The observation is stale or does not belong to the active armature episode.");
        if (!double.IsFinite(targetShoulderAngleRadians) || !double.IsFinite(targetElbowAngleRadians) ||
            !double.IsFinite(maximumCorrectionRadiansPerStep) || maximumCorrectionRadiansPerStep <= 0 ||
            !float.IsFinite(deltaTimeSeconds) || deltaTimeSeconds < 0 ||
            !float.IsFinite(observation.ShoulderAngleRadians) || !float.IsFinite(observation.ElbowAngleRadians))
            throw new ArgumentOutOfRangeException(nameof(targetShoulderAngleRadians), "Targets, observations, timestep, and proposal bound must be finite; the bound must be positive and timestep non-negative.");

        var shoulderError = targetShoulderAngleRadians - observation.ShoulderAngleRadians;
        var elbowError = targetElbowAngleRadians - observation.ElbowAngleRadians;
        if (!double.IsFinite(shoulderError) || !double.IsFinite(elbowError))
            throw new ArgumentOutOfRangeException(nameof(targetShoulderAngleRadians), "Derived joint errors must be finite.");
        var validationTicks = Stopwatch.GetElapsedTime(validationStarted).Ticks;

        var inputs = new Dictionary<string, IReadOnlyList<double>>(StringComparer.Ordinal)
        {
            [InputNodeId] = [shoulderError, elbowError]
        };

        var inferenceStarted = Stopwatch.GetTimestamp();
        var evaluation = new CpuReferenceEvaluator().Evaluate(ProposalGraph, inputs, Budget, captureTrace);
        var inferenceTicks = Stopwatch.GetElapsedTime(inferenceStarted).Ticks;
        var raw = evaluation.Outputs[OutputKey];
        var shoulderCorrection = Math.Clamp(raw[0], -maximumCorrectionRadiansPerStep, maximumCorrectionRadiansPerStep);
        var elbowCorrection = Math.Clamp(raw[1], -maximumCorrectionRadiansPerStep, maximumCorrectionRadiansPerStep);

        // Compose half-error corrections with measured angles. Gestures independently applies
        // its legal-range clamp and angular-speed limit during Advance().
        var requestedShoulderTarget = (float)(observation.ShoulderAngleRadians + shoulderCorrection);
        var requestedElbowTarget = (float)(observation.ElbowAngleRadians + elbowCorrection);
        if (!float.IsFinite(requestedShoulderTarget) || !float.IsFinite(requestedElbowTarget))
            throw new ArgumentOutOfRangeException(nameof(maximumCorrectionRadiansPerStep), "Composed joint targets must remain finite.");
        var action = new PlanarArmatureAction(
            StatefulPlanarArmature.CurrentContractVersion,
            observation.EpisodeId,
            observation.StepIndex,
            PlanarArmatureActionMode.JointAngleTargets,
            requestedShoulderTarget,
            requestedElbowTarget);

        var commandTicks = Stopwatch.GetElapsedTime(inferenceStarted).Ticks - inferenceTicks;
        var advanceStarted = Stopwatch.GetTimestamp();
        var step = armature.Advance(action, deltaTimeSeconds);
        var advanceTicks = Stopwatch.GetElapsedTime(advanceStarted).Ticks;

        return new ReachStepEvidence(
            AdapterSchemaVersion,
            evaluation.ModelVersion,
            observation.ContractVersion,
            observation.EpisodeId,
            observation.StepIndex,
            targetShoulderAngleRadians,
            targetElbowAngleRadians,
            shoulderError,
            elbowError,
            raw[0],
            raw[1],
            shoulderCorrection,
            elbowCorrection,
            requestedShoulderTarget,
            requestedElbowTarget,
            step.AcceptedShoulderTargetRadians,
            step.AcceptedElbowTargetRadians,
            step.Observation.ShoulderAngleRadians,
            step.Observation.ElbowAngleRadians,
            step.Observation.AchievedEndEffectorPosition.X,
            step.Observation.AchievedEndEffectorPosition.Y,
            step.Observation.StepIndex,
            captureTrace,
            evaluation.TraceTruncated,
            evaluation.Trace.Select(item => item.NodeId).ToArray(),
            validationTicks,
            inferenceTicks,
            commandTicks,
            advanceTicks);
    }
}

/// <summary>Compact serializable evidence; timings are diagnostics, not benchmark claims.</summary>
public sealed record ReachStepEvidence(
    int AdapterSchemaVersion,
    string ModelVersion,
    int ObservationContractVersion,
    string EpisodeId,
    long InputStepIndex,
    double TargetShoulderAngleRadians,
    double TargetElbowAngleRadians,
    double ShoulderErrorRadians,
    double ElbowErrorRadians,
    double RawShoulderCorrectionRadians,
    double RawElbowCorrectionRadians,
    double BoundedShoulderCorrectionRadians,
    double BoundedElbowCorrectionRadians,
    float RequestedShoulderTargetRadians,
    float RequestedElbowTargetRadians,
    float GesturesAcceptedShoulderTargetRadians,
    float GesturesAcceptedElbowTargetRadians,
    float AchievedShoulderAngleRadians,
    float AchievedElbowAngleRadians,
    float AchievedEndEffectorX,
    float AchievedEndEffectorY,
    long OutputStepIndex,
    bool TraceCaptured,
    bool TraceTruncated,
    IReadOnlyList<string> TraceNodeIds,
    long ValidationElapsedTicks,
    long InferenceElapsedTicks,
    long CommandMappingElapsedTicks,
    long GesturesAdvanceElapsedTicks);
