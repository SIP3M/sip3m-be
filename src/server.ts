import app from "./app";
import { startKkmPeriodCron } from "./kkm/periods/kkm-period.cron";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startKkmPeriodCron();
});
