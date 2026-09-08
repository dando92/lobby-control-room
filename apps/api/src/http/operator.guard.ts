import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { VenueSettingsStore } from "@api/venue-settings.store";

@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(private readonly settings: VenueSettingsStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { reach, operatorPassword } = await this.settings.current();
    if (reach === "this-machine") {
      return true;
    }
    if (context.switchToHttp().getRequest().headers["x-operator-password"] !== operatorPassword) {
      throw new UnauthorizedException("The venue passphrase is missing or wrong");
    }

    return true;
  }
}
