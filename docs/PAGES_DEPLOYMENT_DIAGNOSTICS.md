# GitHub Pages deployment diagnostics

This note records the cross-repository deployment investigation without treating an unverified hypothesis as a root cause.

## Evidence

The Hermit and GUI `development` Pages workflows have matching deployment mechanics:

- Push trigger targets `development`; manual dispatch is enabled.
- The deploy job runs only for push and manual-dispatch events.
- The deploy job depends on the build job.
- Both use the `github-pages` environment.
- Both grant the deploy job `pages: write` and `id-token: write`.
- Both invoke the same pinned `actions/deploy-pages` revision.

Observed runs:

| Repository | Workflow run | Build/artifact | Deploy job |
|---|---:|---|---|
| GUI | [45339517233](https://github.com/TrentBest/TheSingularityWorkshop.GUI/actions/runs/45339517233) | Successful | Successful; setup and deploy steps executed |
| Hermit | [45535138906](https://github.com/TrentBest/TheSingularityWorkshop.Hermit/actions/runs/45535138906) | Successful | Failed before any step was reported |

For Hermit run 45535138906, GitHub's workflow-job response reports the deploy job as failed with `steps: null` and `logs_url: null`. The build job completed all steps, including Pages artifact upload. A separate deployment attempt on the prior source commit showed the same pre-step failure pattern.

## What this establishes

The Hermit build output is not the failure point. The deploy action itself has not produced a step result or log for the failing job, so changing artifact assembly or rewriting the deploy action would be guesswork.

The failure appears to occur before the deployment job executes its first step: environment admission/protection, repository deployment policy, or GitHub runner/job provisioning are the next areas to isolate. The available GitHub connection can inspect workflow runs and jobs, but cannot read the repository's Pages or environment configuration endpoints. The repository's UI settings therefore remain unverified from this investigation.

## Diagnostic checklist

1. In **Settings → Environments → github-pages**, verify that deployment branch/tag rules permit `development` (or are unrestricted).
2. Inspect environment protection rules, required reviewers, wait timers, and custom deployment protection rules. Confirm that none rejects or blocks the `development` deployment.
3. In **Settings → Pages**, confirm the build and deployment source is **GitHub Actions**.
4. Compare the complete `github-pages` environment configuration between GUI and Hermit, not only the Pages source selector.
5. If these settings match, capture the failing deploy job's UI message and check GitHub Actions runner/service status; the missing job steps and logs point to a failure before `actions/deploy-pages` begins.

Do not change the working GUI workflow to compensate for a Hermit-specific setting until the differing control is identified. Do not claim deployment success merely because artifact upload succeeds.
