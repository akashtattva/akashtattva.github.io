---
title: "Process Reward Model in RL Training"
pubDate: 2025-10-09
---

## Process reward model in RL training process

## What is a Process Reward Model (PRM) in RL training?

In RL training, a Reward Model method is used to tell the AI how well it's doing.

1. Standard Reward Model  (outcome oriented): The AI is only rewarded at the end of a task based on the final answer. It's like grading a math test by only looking at the final answer in the box, ignoring the work shown.

2. Process Reward Model (PRM): The AI gets rewarded for each correct intermediate step it takes, like a teacher checking each line of your math homework, providing guidance along the way. Train the AI not just to guess the right answer, but to follow a correct and logical reasoning process.

The Deepseek technical report says that PRM is a "reasonable method" that can help guide AI models toward better problem-solving strategies but is difficult to implement effectively.

1. Problem of Defining a "Step": It's very challenging to define what a "correct step" is for general reasoning. In math, a step might be clear (e.g., "simplify this equation"), but in open-ended tasks like writing an essay or debating a topic, defining a fine-grained "correct step" is ambiguous and subjective.

2. Problem of Annotating Steps: Even if we can define a step, how do we know if it's correct? The text points out two flawed options:
    1. Automated Annotation (using another AI model): This may be unreliable because the AI model itself might not be a perfect judge.
    2. Manual Annotation (by humans): This is highly accurate but is extremely slow, expensive, and doesn't scale to the massive amounts of data needed to train modern AI.
3. Problem of Reward Hacking and Complexity: Once you train a separate AI model to act as the PRM (judging each step), a new problem emerges: Reward Hacking.

The main AI being trained might learn to produce steps that *look* good to the reward model but are actually logically flawed or nonsensical. Fixing this requires constantly retraining the reward model, which adds significant computational cost and complexity to the entire training pipeline.
