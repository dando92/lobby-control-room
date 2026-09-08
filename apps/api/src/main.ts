import { NestFactory } from "@nestjs/core";
import { ControlRoomModule } from "./control-room.module";
import { ControlRoomConfig } from "./control-room.config";
import { VenueSettingsStore } from "./venue-settings.store";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ControlRoomModule);
  app.enableShutdownHooks();
  app.enableCors({ origin: process.env.CONTROL_ROOM_CORS_ORIGINS?.split(",") ?? true });

  const settings = app.get(VenueSettingsStore);
  await app.listen(app.get(ControlRoomConfig).port, settings.hostOf(await settings.current()));
}
void bootstrap();
