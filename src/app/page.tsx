"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type GoalType = "daily" | "monthly" | "anytime";

type Goal = {
  id: string;
  title: string;
  type: GoalType;
  notes: string;
  targetCount?: number;
  dueDate?: string;
  createdAt: string;
  entries: Record<string, number>;
};

type GoalForm = {
  title: string;
  type: GoalType;
  notes: string;
  targetCount: string;
  dueDate: string;
};

const STORAGE_KEY = "resolutions.v1";

const typeLabels: Record<GoalType, string> = {
  daily: "Daily",
  monthly: "Monthly",
  anytime: "Anytime",
};

const typeDescriptions: Record<GoalType, string> = {
  daily: "Small rituals to show up every day.",
  monthly: "Milestones worth revisiting each month.",
  anytime: "Goals that move on your schedule.",
};

const emptyForm: GoalForm = {
  title: "",
  type: "daily",
  notes: "",
  targetCount: "",
  dueDate: "",
};

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const formatMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  return `${year}-${month}`;
};

const getPeriodKey = (type: GoalType, date = new Date()) => {
  if (type === "daily") {
    return formatDateKey(date);
  }
  if (type === "monthly") {
    return formatMonthKey(date);
  }
  return "all";
};

const getTargetForGoal = (goal: Goal) => {
  if (goal.targetCount) {
    return goal.targetCount;
  }
  if (goal.type === "anytime") {
    return undefined;
  }
  return 1;
};

const getCountForPeriod = (goal: Goal, periodKey: string) =>
  goal.entries[periodKey] ?? 0;

const isGoalComplete = (goal: Goal, periodKey: string) => {
  const target = getTargetForGoal(goal);
  const count = getCountForPeriod(goal, periodKey);
  if (target) {
    return count >= target;
  }
  return count > 0;
};

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Goal[];
        if (Array.isArray(parsed)) {
          setGoals(parsed);
        }
      } catch (error) {
        console.error("Failed to parse stored goals", error);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals, isLoaded]);

  const dailyKey = useMemo(() => getPeriodKey("daily"), []);
  const monthlyKey = useMemo(() => getPeriodKey("monthly"), []);

  const dailyGoals = useMemo(
    () => goals.filter((goal) => goal.type === "daily"),
    [goals],
  );
  const monthlyGoals = useMemo(
    () => goals.filter((goal) => goal.type === "monthly"),
    [goals],
  );
  const anytimeGoals = useMemo(
    () => goals.filter((goal) => goal.type === "anytime"),
    [goals],
  );

  const stats = useMemo(() => {
    const dailyDone = dailyGoals.filter((goal) =>
      isGoalComplete(goal, dailyKey),
    ).length;
    const monthlyDone = monthlyGoals.filter((goal) =>
      isGoalComplete(goal, monthlyKey),
    ).length;
    const anytimeDone = anytimeGoals.filter((goal) =>
      isGoalComplete(goal, "all"),
    ).length;

    const totalGoals = goals.length;
    const completedGoals = dailyDone + monthlyDone + anytimeDone;
    const completionRate = totalGoals
      ? Math.round((completedGoals / totalGoals) * 100)
      : 0;

    return {
      totalGoals,
      dailyDone,
      monthlyDone,
      anytimeDone,
      completionRate,
    };
  }, [dailyGoals, monthlyGoals, anytimeGoals, goals, dailyKey, monthlyKey]);

  const handleChange = (field: keyof GoalForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      return;
    }

    const targetCount = form.targetCount
      ? Number.parseInt(form.targetCount, 10)
      : undefined;

    const nextGoal: Goal = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      type: form.type,
      notes: form.notes.trim(),
      targetCount:
        Number.isNaN(targetCount) || targetCount === 0
          ? undefined
          : targetCount,
      dueDate: form.dueDate || undefined,
      createdAt: new Date().toISOString(),
      entries: {},
    };

    setGoals((current) => [nextGoal, ...current]);
    setForm(emptyForm);
  };

  const updateGoalCount = (goalId: string, delta: number) => {
    setGoals((current) =>
      current.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }
        const periodKey = getPeriodKey(goal.type);
        const currentCount = getCountForPeriod(goal, periodKey);
        const nextCount = Math.max(0, currentCount + delta);

        return {
          ...goal,
          entries: {
            ...goal.entries,
            [periodKey]: nextCount,
          },
        };
      }),
    );
  };

  const deleteGoal = (goalId: string) => {
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
  };

  return (
    <div className="min-h-screen app-bg text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[120%] -translate-x-1/2 opacity-70">
          <div className="mountain-layer" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">
                New Year Compass
              </p>
              <h1 className="mt-3 text-4xl font-[var(--font-display)] text-slate-900 sm:text-5xl">
                Summit Resolutions
              </h1>
            </div>
            <div className="rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 shadow-sm">
              {new Date().getFullYear()} Focus
            </div>
          </div>
          <p className="max-w-2xl text-lg text-emerald-900/80">
            Track daily rituals, monthly milestones, and anytime ambitions.
            Check in as you go and keep your year moving toward what matters.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-[var(--font-display)] text-slate-900">
              Dashboard Overview
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              A quick scan of today, this month, and your long trails.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Total goals"
                value={stats.totalGoals}
                hint="All resolutions"
              />
              <StatCard
                label="Completed today"
                value={stats.dailyDone}
                hint="Daily check-ins"
              />
              <StatCard
                label="Completed this month"
                value={stats.monthlyDone}
                hint="Monthly milestones"
              />
              <StatCard
                label="Completion rate"
                value={`${stats.completionRate}%`}
                hint="Across all goals"
              />
            </div>
          </div>

          <div className="glass-card rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-[var(--font-display)] text-slate-900">
              Add a New Resolution
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Capture intention, cadence, and a target to guide you.
            </p>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(event) =>
                    handleChange("title", event.target.value)
                  }
                  className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring-2"
                  placeholder="Ex: Walk among the pines"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    handleChange("type", event.target.value as GoalType)
                  }
                  className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring-2"
                >
                  <option value="daily">Daily goal</option>
                  <option value="monthly">Monthly goal</option>
                  <option value="anytime">Anytime goal</option>
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                    Target count
                  </label>
                  <input
                    value={form.targetCount}
                    onChange={(event) =>
                      handleChange("targetCount", event.target.value)
                    }
                    inputMode="numeric"
                    className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring-2"
                    placeholder="Ex: 4"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      handleChange("dueDate", event.target.value)
                    }
                    className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring-2"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    handleChange("notes", event.target.value)
                  }
                  rows={3}
                  className="rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring-2"
                  placeholder="Why does this matter to you?"
                />
              </div>
              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-50 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800"
              >
                Add goal
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <GoalColumn
            title="Daily Goals"
            description={typeDescriptions.daily}
            periodKey={dailyKey}
            periodLabel="Today"
            goals={dailyGoals}
            onIncrement={updateGoalCount}
            onDecrement={updateGoalCount}
            onDelete={deleteGoal}
          />
          <GoalColumn
            title="Monthly Goals"
            description={typeDescriptions.monthly}
            periodKey={monthlyKey}
            periodLabel="This month"
            goals={monthlyGoals}
            onIncrement={updateGoalCount}
            onDecrement={updateGoalCount}
            onDelete={deleteGoal}
          />
          <GoalColumn
            title="Anytime Goals"
            description={typeDescriptions.anytime}
            periodKey="all"
            periodLabel="Overall"
            goals={anytimeGoals}
            onIncrement={updateGoalCount}
            onDecrement={updateGoalCount}
            onDelete={deleteGoal}
          />
        </section>

        <section className="glass-card rounded-3xl p-8 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-[var(--font-display)] text-slate-900">
                Progress Stats
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Balance quick wins with deep momentum.
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {stats.anytimeDone} anytime completed
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ProgressTile
              title="Daily rhythm"
              value={`${stats.dailyDone}/${dailyGoals.length}`}
              caption="Checked in today"
            />
            <ProgressTile
              title="Monthly focus"
              value={`${stats.monthlyDone}/${monthlyGoals.length}`}
              caption="Milestones this month"
            />
            <ProgressTile
              title="Yearly trail"
              value={`${stats.anytimeDone}/${anytimeGoals.length}`}
              caption="Anytime goals finished"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
  hint: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/70 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {label}
      </p>
      <p className="mt-3 text-3xl font-[var(--font-display)] text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-600">{hint}</p>
    </div>
  );
}

type ProgressTileProps = {
  title: string;
  value: string;
  caption: string;
};

function ProgressTile({ title, value, caption }: ProgressTileProps) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/70 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {title}
      </p>
      <p className="mt-3 text-2xl font-[var(--font-display)] text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-600">{caption}</p>
    </div>
  );
}

type GoalColumnProps = {
  title: string;
  description: string;
  periodKey: string;
  periodLabel: string;
  goals: Goal[];
  onIncrement: (goalId: string, delta: number) => void;
  onDecrement: (goalId: string, delta: number) => void;
  onDelete: (goalId: string) => void;
};

function GoalColumn({
  title,
  description,
  periodKey,
  periodLabel,
  goals,
  onIncrement,
  onDecrement,
  onDelete,
}: GoalColumnProps) {
  return (
    <div className="glass-card rounded-3xl p-6 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-[var(--font-display)] text-slate-900">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          {goals.length}
        </span>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/60 px-4 py-6 text-sm text-slate-600">
            Add a {title.toLowerCase()} resolution to get started.
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              periodKey={periodKey}
              periodLabel={periodLabel}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

type GoalCardProps = {
  goal: Goal;
  periodKey: string;
  periodLabel: string;
  onIncrement: (goalId: string, delta: number) => void;
  onDecrement: (goalId: string, delta: number) => void;
  onDelete: (goalId: string) => void;
};

function GoalCard({
  goal,
  periodKey,
  periodLabel,
  onIncrement,
  onDecrement,
  onDelete,
}: GoalCardProps) {
  const count = getCountForPeriod(goal, periodKey);
  const target = getTargetForGoal(goal);
  const isComplete = isGoalComplete(goal, periodKey);
  const progress = target
    ? Math.min(100, Math.round((count / target) * 100))
    : 0;

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/75 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {typeLabels[goal.type]} · {periodLabel}
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">
            {goal.title}
          </h4>
          {goal.notes ? (
            <p className="mt-2 text-sm text-slate-600">{goal.notes}</p>
          ) : null}
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-rose-500"
          type="button"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {goal.dueDate ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Due {new Date(goal.dueDate).toLocaleDateString()}
          </span>
        ) : null}
        {target ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Target {target}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            No target set
          </span>
        )}
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {count} logged
        </span>
      </div>

      {target ? (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-emerald-100">
            <div
              className="h-2 rounded-full bg-emerald-700 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            {progress}% of target
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onDecrement(goal.id, -1)}
          disabled={count === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 text-lg text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => onIncrement(goal.id, 1)}
          className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50 transition hover:bg-emerald-800"
        >
          Check in
        </button>
        {isComplete ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Complete
          </span>
        ) : null}
      </div>
    </div>
  );
}
