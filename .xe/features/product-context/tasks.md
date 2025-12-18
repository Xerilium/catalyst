---
id: product-context
title: Product Context Templates
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Product Context Templates feature."
---

# Tasks: Product Context Templates

**Input**: Design documents from `.xe/features/product-context/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

None

## Step 2: Tests First (TDD)

> **CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

- [ ] T001: Create validation script for product.md template
  - @req FR:product-context/product.template
  - @req FR:product-context/product.overview
  - @req FR:product-context/product.system
  - @req FR:product-context/product.strategy
  - @req FR:product-context/product.principles
  - @req FR:product-context/product.nongoals
  - @req FR:product-context/product.team
  - @req FR:product-context/product.optimized

- [ ] T002: Create validation script for competitive-analysis.md template
  - @req FR:product-context/competitive.template
  - @req FR:product-context/competitive.assessment
  - @req FR:product-context/competitive.landscape
  - @req FR:product-context/competitive.tablestakes
  - @req FR:product-context/competitive.differentiation
  - @req FR:product-context/competitive.positioning
  - @req FR:product-context/competitive.optimized

## Step 3: Core Implementation

- [ ] T003: Create product.md template
  - @req FR:product-context/product.template
  - @req FR:product-context/product.overview
  - @req FR:product-context/product.system
  - @req FR:product-context/product.strategy
  - @req FR:product-context/product.principles
  - @req FR:product-context/product.nongoals
  - @req FR:product-context/product.team
  - @req FR:product-context/product.optimized
  - @req NFR:product-context/cost
  - @req NFR:product-context/reliability

- [ ] T004: Create competitive-analysis.md template
  - @req FR:product-context/competitive.template
  - @req FR:product-context/competitive.assessment
  - @req FR:product-context/competitive.landscape
  - @req FR:product-context/competitive.tablestakes
  - @req FR:product-context/competitive.differentiation
  - @req FR:product-context/competitive.positioning
  - @req FR:product-context/competitive.optimized
  - @req NFR:product-context/cost
  - @req NFR:product-context/reliability

## Step 4: Integration

None

## Step 5: Polish

None
