export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDeadlineScheduler } = await import(
      "@/lib/notifications/deadline-scheduler"
    );
    startDeadlineScheduler();
  }
}
