import { createApp } from "./app.js";
import { env } from "./config/env.js";

const PORT = env.PORT;
const HOST = env.HOST;

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`Backend running on port ${PORT}`);
});
