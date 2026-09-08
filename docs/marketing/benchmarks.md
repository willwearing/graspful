# Course authoring benchmark plan

Graspful has no verified benchmark for course creation time, learner retention, or exam pass rates. The former time estimates and platform comparisons were not supported by recorded trials. Use the plan below to collect evidence before publishing performance claims.

## What to measure

Keep these stages separate:

| Stage | Completion condition | Record |
|-------|----------------------|--------|
| Scaffold | A draft file exists | Command, version, elapsed time, output |
| Author | Sources, lessons, worked examples, and questions are complete | Source set, content size, agent and model, elapsed time, human time |
| Mechanical review | Validation and quality checks finish | Findings, corrections, command results |
| Content review | A subject reviewer checks the material | Factual errors, ambiguous questions, omitted topics, corrections, reviewer time |
| Import | The server confirms that the draft is stored | Response, errors, retries, elapsed time |
| Publish | The server confirms publication | Response, learner-access check, elapsed time |

The CLI scaffold and fill commands produce draft placeholders. Report that output as a scaffold. Count complete, reviewed content separately.

## Trial design

1. Choose a fixed source set, learner audience, and course scope.
2. Define completion criteria before the trial. Include factual review and learner access.
3. Record the environment and tool versions. Include the external agent, model, and prompts when used.
4. Capture retries, failed checks, and manual corrections.
5. Repeat the trial and retain every run. Report the sample size and range alongside any average.
6. Have a reviewer check the resulting content against the same criteria for every workflow.
7. Publish the commands, artifacts, measurement method, and limits with the result.

## Comparing authoring workflows

Use the same source material and completion criteria across manual authoring, CLI-assisted authoring, and agent-assisted authoring. Account for research, editing, review, setup, and import time. Record platform behavior during the trial instead of assuming which features a competitor supports.

## Measuring learner outcomes

Course creation speed does not establish learning effectiveness. Retention or exam-result claims need a separate evaluation with defined learners, assessments, timing, sample size, and treatment of incomplete results. Keep diagnostic estimates distinct from independently assessed learning outcomes.

## Payment scope

Payment collection and creator payouts are pending live setup and verification. Exclude them from claims about a working customer launch until those flows have been tested.
