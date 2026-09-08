# How to evaluate Graspful

Choose a platform by testing the authoring and learner workflows you need. This guide describes what to inspect in Graspful. It makes no claim about current competitor features, pricing, or relative performance.

## Course authoring

Graspful stores course content in YAML files. An author or an external agent uses CLI commands or MCP tools to create drafts, add content, validate the graph, and import files.

A scaffold is a draft with placeholders. The author must supply source material, write the content, review the answers, and decide when the course is ready to publish. Read the [authoring runbook](../adding-a-course.md).

## Evaluation checklist

| Need | What to test in Graspful |
|------|-------------------------|
| Inspect and edit the content | Export or open the YAML. Change an explanation, question, or prerequisite and validate it. |
| Use an external agent | Ask the agent to create a scaffold, fill one concept from a source, and fix review findings through CLI or MCP tools. |
| Review before publication | Try incomplete content and confirm the quality gate reports the relevant problems. Review factual accuracy separately. |
| Control publication | Import a draft, inspect it, publish it, and verify learner access. Confirm failed publication is reported as a failure. |
| Guide practice | Complete a diagnostic and lesson. Check which tasks become available after correct and incorrect answers. |
| Schedule review | Complete a concept and inspect the resulting review schedule. |
| Apply branding | Import a brand file and check the landing page, course scope, and theme. Test custom-domain routing after hosting setup. |
| Collect payments | Wait for live Stripe setup and verification before offering paid access or creator payouts. |

## Compare with the same task

Run the same small course through each platform under consideration. Use the same source material, questions, learner actions, and review criteria. Record setup time, authoring time, failures, corrections, and the resulting learner experience.

Check current vendor documentation and plans for competitor capabilities and prices. Record the date and source with any comparison. The [benchmark plan](benchmarks.md) explains the evidence needed for time and quality claims.

## Current limits

Automated checks catch structural issues and selected content patterns. The author remains responsible for factual accuracy and useful instruction. Progress estimates reflect answers to course questions. Paid subscriptions and creator payouts need live configuration and verification.
