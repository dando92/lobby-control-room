import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ControlRoomConfig } from "./control-room.config";
import { VenueSettingsStore } from "./venue-settings.store";
import { CompletionRecorder } from "./lobbies/completion-recorder";
import { LobbyBindings } from "./lobbies/lobby-bindings";
import { LOBBY_OBSERVERS } from "./lobbies/lobby-observers";
import { syncStartClientFactoryProvider } from "./lobbies/syncstart-client.factory";
import { SyncStartRuntime } from "./lobbies/syncstart.runtime";
import { SubmissionDispatcher } from "./submissions/submission-dispatcher";
import { SubmissionQueue } from "./submissions/submission-queue";
import { LobbyTelemetryHub } from "./telemetry/lobby-telemetry.hub";
import { PlayPlanPoller } from "./tournament-hub/play-plan.poller";
import { TournamentHubClient } from "./tournament-hub/tournament-hub.client";
import { ConsoleController } from "./http/console.controller";
import { ConsoleService } from "./http/console.service";
import { ConsoleStream } from "./http/console.stream";
import { HealthController } from "./http/health.controller";
import { OperatorGuard } from "./http/operator.guard";

@Module({
    imports: [ConfigModule.forRoot({ envFilePath: ["../../.env", ".env"], isGlobal: true })],
    controllers: [HealthController, ConsoleController],
    providers: [
        ControlRoomConfig,
        VenueSettingsStore,
        TournamentHubClient,
        PlayPlanPoller,
        SubmissionQueue,
        SubmissionDispatcher,
        LobbyBindings,
        LobbyTelemetryHub,
        CompletionRecorder,
        syncStartClientFactoryProvider,
        SyncStartRuntime,
        ConsoleService,
        ConsoleStream,
        OperatorGuard,
        {
            provide: LOBBY_OBSERVERS,
            inject: [LobbyTelemetryHub, CompletionRecorder],
            useFactory: (telemetry: LobbyTelemetryHub, completions: CompletionRecorder) => [telemetry, completions],
        },
    ],
})
export class ControlRoomModule {}
