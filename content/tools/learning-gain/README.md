# Learning-gain eval

The review gate says whether a course is well formed. Once a course scores 10/10 it has nothing left to climb. This eval gives course work a number that can keep going up: how much of a hidden exam a simulated student answers from the course alone.

## How it scores

A small model (Haiku) plays a new hire and takes a multiple-choice exam three ways:

| Mode | Reading the student gets | What it tells you |
|------|--------------------------|-------------------|
| `guess` | Nothing | The floor. Questions answerable by common sense. |
| `taught` | The concept's lesson plus its direct prerequisites | The score the loop tries to raise. |
| `oracle` | The source material the exam was written from | Exam health. Items the oracle misses are broken and stop counting. |

In `taught` and `oracle` mode a right answer only counts when it's backed by a verbatim quote (6+ words) from the reading. That keeps the model's own knowledge of the topic from passing as learning. A miss is one of:

- `abstain`: the lesson doesn't cover it. Add the missing idea.
- `unsupported`: the student picked an answer the lesson doesn't state. Make the idea explicit.
- `wrong`: the lesson led the student to the wrong option. The lesson is unclear or misleading.

Learning gain is `(taught - guess) / (1 - guess)` on the dev split.

## The exam stays hidden

The repo is public and the improving agent must not see the questions, so exams live outside it (for the daily loop: `~/.claude/scheduled-tasks/graspful-course-loop/exams/`). Write each exam from the course's source material, never from the course.

Items are split. `dev` items report per concept with their objective (the skill tested, never the question), and the loop optimizes those. `test` items only ever report as one aggregate number. If dev climbs while test falls, the loop is overfitting.

## Commands

```bash
LG="bun content/tools/learning-gain/cli.ts"
$LG check --course <course.yaml> --exam <exam.json>
$LG prepare --course <course.yaml> --exam <exam.json> --mode taught --samples 3 --out <dir> [--concepts a,b]
# a Haiku subagent per batch-sN.txt answers every packet listed in it
$LG grade --dir <dir>
$LG calibrate --exam <exam.json> --oracle <oracle-dir> --guess <guess-dir>
$LG affected --course <course.yaml> --target <concept-id>
$LG decide --before <dir>/report.json --after <dir>/report.json --target <concept-id>
```

With `ANTHROPIC_API_KEY` set, `run` replaces prepare + subagents + grade in one step, at temperature 0.

`decide` keeps a change only when the target concept gains at least one dev item (majority vote across samples) and no other re-scored concept loses one.
