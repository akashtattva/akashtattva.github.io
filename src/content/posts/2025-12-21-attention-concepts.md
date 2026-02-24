---
title: "Attention Mechanism"
pubDate: 2025-12-21
---
# Core Concepts of Attention

The attention mechanism is a concept in deep learning that allows a model to focus on specific parts of an input when producing an output. This is inspired by how humans pay attention to certain parts of a scene or a sentence to understand it better.

## Seq2Seq Model Limitations

The traditional Sequence-to-Sequence (Seq2Seq) model has a limitation, especially with long sentences. It compresses the entire input into a single fixed-length context vector. This "bottleneck" can lead to the loss of information from earlier parts of the input.

To address this, the attention mechanism was introduced. It creates shortcuts between the context vector and the entire source input. This allows the model to look at the entire input and selectively focus on the relevant parts for each step of the output generation.

## Attention Mechanism in Neural Machine Translation (NMT)

In the context of Neural Machine Translation (NMT), the attention mechanism works by calculating a set of attention weights. These weights determine how much focus to place on each of the encoder's hidden states when decoding a particular word.

The core idea is to compute a score for each encoder hidden state, and then normalize these scores to get the final weights. These weights are then used to create a weighted sum of the encoder hidden states, which is the context vector used for decoding.

## Types of Attention

There are several ways to categorize attention mechanisms.

### Based on Scoring Function

Different attention mechanisms use different scoring functions to calculate the alignment scores. Some of the common ones include:

*   **Content-based attention**: The score is a function of the decoder's hidden state and the encoder's hidden state.
   
*   **Additive attention**: A feed-forward network is used to compute the score.
   
*   **Location-based attention**: The score is a function of the decoder's hidden state and the position of the encoder's hidden state.
    
*   **General attention**: The score is a dot product between the decoder's hidden state and the encoder's hidden state.
    
*   **Dot-Product attention**: A simple dot product between the two states.
   
*   **Scaled Dot-Product attention**: A dot product that is scaled by the square root of the dimension of the key vectors. This is used in the Transformer model.

### Self-Attention

Self-attention, also known as intra-attention, is an attention mechanism that relates different positions of the same input sequence. It allows the model to look at other words in the input sentence to get a better encoding for a specific word.

### Soft vs. Hard Attention

*   **Soft Attention**: The model attends to the entire input space, and the attention weights are probabilities that sum to 1. This is the most common type of attention and is differentiable.

*   **Hard Attention**: The model selects a specific patch of the input to attend to. This is less common and is not differentiable, so it requires more complex training techniques like reinforcement learning.

### Global vs. Local Attention

*   **Global Attention**: This is similar to soft attention, where the model attends to all the source positions.
  
*   **Local Attention**: This is a blend of soft and hard attention. The model first predicts an aligned position and then focuses on a small window of source positions around that aligned position.

These notes are for me to develop some intuition. To understand mmore technically, you can refer to the original blog post by Lilian Weng: [Attention? Attention!](https://lilianweng.github.io/posts/2018-06-24-attention/)

# Attention in Models

Attention mechanisms have been successfully applied to various deep learning models across different domains.

## Transformer

The Transformer model, introduced in the paper "Attention is All You Need", is a model that relies entirely on self-attention mechanisms without using recurrent units. It has become the foundation for many state-of-the-art models in NLP.

The core components of the Transformer are:

*   **Key, Value, and Query**: In the self-attention mechanism, for each input, we have a query, a key, and a value. The query is used to score against all the keys, and the scores are then used to get a weighted sum of the values.
*   **Multi-Head Self-Attention**: Instead of performing a single attention function, the Transformer uses multiple attention heads. This allows the model to jointly attend to information from different representation subspaces at different positions.

The Transformer architecture consists of an encoder and a decoder. Both are composed of multiple layers with multi-head self-attention and feed-forward networks. Residual connections and layer normalization are also used to improve the training process.

## Neural Turing Machines (NTM)

A Neural Turing Machine (NTM) is a model that couples a neural network with external memory. Attention is used for reading from and writing to the memory. The model learns to use the attention mechanism to selectively read from and write to specific memory locations.

## Pointer Network (Ptr-Net)

A Pointer Network (Ptr-Net) is designed for problems where the output elements correspond to positions in an input sequence. For example, in the traveling salesman problem, the output is a permutation of the input cities.

Ptr-Net uses attention to "point" to an input element as the output. The attention weights are directly used as the output probabilities.

## SNAIL (Simple Neural Attention Meta-Learner)

The Simple Neural Attention Meta-Learner (SNAIL) is a model that combines self-attention with temporal convolutions. It was proposed to address the issue of positional dependency in Transformers, especially in the context of reinforcement learning where the order of observations matters.

## Self-Attention GAN (SAGAN)

Generative Adversarial Networks (GANs) can also benefit from attention. The Self-Attention GAN (SAGAN) integrates self-attention layers into the generator and discriminator.

This allows the model to better model relationships between spatial regions, even those that are far apart. This helps to overcome the limitations of convolutional networks, which have a fixed filter size and thus a limited receptive field.

# Attention in Models

Attention mechanisms have been successfully applied to various deep learning models across different domains.

## Transformer

The Transformer model, introduced in the paper "Attention is All You Need", is a model that relies entirely on self-attention mechanisms without using recurrent units. It has become the foundation for many state-of-the-art models in NLP.

The core components of the Transformer are:

*   **Key, Value, and Query**: In the self-attention mechanism, for each input, we have a query, a key, and a value. The query is used to score against all the keys, and the scores are then used to get a weighted sum of the values.
*   **Multi-Head Self-Attention**: Instead of performing a single attention function, the Transformer uses multiple attention heads. This allows the model to jointly attend to information from different representation subspaces at different positions.

The Transformer architecture consists of an encoder and a decoder. Both are composed of multiple layers with multi-head self-attention and feed-forward networks. Residual connections and layer normalization are also used to improve the training process.

## Neural Turing Machines (NTM)

A Neural Turing Machine (NTM) is a model that couples a neural network with external memory. Attention is used for reading from and writing to the memory. The model learns to use the attention mechanism to selectively read from and write to specific memory locations.

## Pointer Network (Ptr-Net)

A Pointer Network (Ptr-Net) is designed for problems where the output elements correspond to positions in an input sequence. For example, in the traveling salesman problem, the output is a permutation of the input cities.

Ptr-Net uses attention to "point" to an input element as the output. The attention weights are directly used as the output probabilities.

## SNAIL (Simple Neural Attention Meta-Learner)

The Simple Neural Attention Meta-Learner (SNAIL) is a model that combines self-attention with temporal convolutions. It was proposed to address the issue of positional dependency in Transformers, especially in the context of reinforcement learning where the order of observations matters.

## Self-Attention GAN (SAGAN)

Generative Adversarial Networks (GANs) can also benefit from attention. The Self-Attention GAN (SAGAN) integrates self-attention layers into the generator and discriminator.

This allows the model to better model relationships between spatial regions, even those that are far apart. This helps to overcome the limitations of convolutional networks, which have a fixed filter size and thus a limited receptive field.


