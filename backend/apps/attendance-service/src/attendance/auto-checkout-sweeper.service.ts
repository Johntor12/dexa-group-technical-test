import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository.js';

@Injectable()
export class AutoCheckoutSweeper implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly repo: AttendanceRepository) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.sweep().catch(() =>
        Logger.warn('Automatic checkout postponed', 'AutoCheckoutSweeper'),
      );
    }, 30_000);
    this.timer.unref();
    void this.sweep().catch(() =>
      Logger.warn('Automatic checkout postponed', 'AutoCheckoutSweeper'),
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep() {
    const due = await this.repo.db.attendance.findMany({
      where: { checkOutAt: null, checkOutDueAt: { lte: new Date() } },
      select: { id: true, checkOutDueAt: true },
      take: 100,
    });
    const recordedAt = new Date();
    let closed = 0;
    for (const row of due) {
      const result = await this.repo.db.attendance.updateMany({
        where: { id: row.id, checkOutAt: null },
        data: {
          checkOutAt: row.checkOutDueAt,
          checkOutRecordedAt: recordedAt,
          checkOutType: 'AUTO',
        },
      });
      closed += result.count;
    }
    if (closed) Logger.log(JSON.stringify({ event: 'attendance.auto_checkout', closed }));
    return closed;
  }
}
