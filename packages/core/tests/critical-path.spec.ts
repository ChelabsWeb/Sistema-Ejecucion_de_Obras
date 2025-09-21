import { describe, expect, it } from "vitest";
import {
  computeCriticalPath,
  type ScheduleTaskInput,
  CriticalPathError
} from "../src/schedule";

describe("computeCriticalPath", () => {
  it("computes a linear critical path", () => {
    const tasks: ScheduleTaskInput[] = [
      { id: "A", duration: 2 },
      { id: "B", duration: 4, predecessors: ["A"] },
      { id: "C", duration: 3, predecessors: ["B"] }
    ];

    const result = computeCriticalPath(tasks);

    expect(result.projectDuration).toBe(9);
    expect(result.criticalPath).toEqual(["A", "B", "C"]);
    expect(result.entries).toHaveLength(3);
    expect(result.entries[1]).toMatchObject({
      id: "B",
      earliestStart: 2,
      latestStart: 2,
      slack: 0,
      isCritical: true
    });
  });

  it("identifies slack on parallel branches", () => {
    const tasks: ScheduleTaskInput[] = [
      { id: "A", duration: 2 },
      { id: "B", duration: 6, predecessors: ["A"] },
      { id: "C", duration: 3, predecessors: ["A"] },
      { id: "D", duration: 1, predecessors: ["B"] },
      { id: "E", duration: 2, predecessors: ["C"] }
    ];

    const result = computeCriticalPath(tasks);

    expect(result.projectDuration).toBe(9);
    expect(result.criticalPath).toEqual(["A", "B", "D"]);
    const taskC = result.entries.find(entry => entry.id === "C");
    expect(taskC?.slack).toBe(2);
    expect(taskC?.isCritical).toBe(false);
  });

  it("throws when encountering a cycle", () => {
    const tasks: ScheduleTaskInput[] = [
      { id: "A", duration: 2, predecessors: ["C"] },
      { id: "B", duration: 2, predecessors: ["A"] },
      { id: "C", duration: 2, predecessors: ["B"] }
    ];

    expect(() => computeCriticalPath(tasks)).toThrow(CriticalPathError);
  });

  it("throws when dependencies are missing", () => {
    const tasks: ScheduleTaskInput[] = [
      { id: "A", duration: 2 },
      { id: "B", duration: 3, predecessors: ["X"] }
    ];

    expect(() => computeCriticalPath(tasks)).toThrow(/unknown predecessor/i);
  });

  it("throws when a duration is zero or negative", () => {
    const tasks: ScheduleTaskInput[] = [{ id: "A", duration: 0 }];

    expect(() => computeCriticalPath(tasks)).toThrow(/greater than zero/);
  });
});
