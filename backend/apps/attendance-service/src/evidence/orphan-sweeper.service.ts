import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { AttendanceRepository } from '../attendance/attendance.repository.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
@Injectable()
export class OrphanSweeper implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly storage: PhotoStorage,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.sweep().catch(() =>
        Logger.warn('Evidence cleanup postponed', 'OrphanSweeper'),
      );
    }, 3600000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async sweep() {
    let removed = 0;
    for (const key of await this.storage.candidates()) {
      // Aged files only. Transaction timeout is seconds; 24h grace excludes in-flight writes.
      if (
        !(await this.repo.db.evidence.findUnique({
          where: { storageKey: key },
        }))
      ) {
        await this.storage.remove(key);
        removed++;
      }
    }
    Logger.log(JSON.stringify({ event: 'evidence.cleanup', removed }));
    return { removed };
  }
}
