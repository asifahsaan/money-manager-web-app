import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(transactionId: number, userId: number) {
    await this.verifyTransactionOwnership(transactionId, userId);
    return this.prisma.transactionAttachment.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    transactionId: number,
    userId: number,
    data: { fileUrl: string; fileName: string; mimeType: string },
  ) {
    await this.verifyTransactionOwnership(transactionId, userId);
    return this.prisma.transactionAttachment.create({
      data: { transactionId, ...data },
    });
  }

  async delete(transactionId: number, attachmentId: number, userId: number): Promise<void> {
    await this.verifyTransactionOwnership(transactionId, userId);

    const attachment = await this.prisma.transactionAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.transactionId !== transactionId) {
      throw new NotFoundException('Attachment not found');
    }

    await this.prisma.transactionAttachment.delete({ where: { id: attachmentId } });

    const filePath = join(process.cwd(), attachment.fileUrl.replace(/^\//, ''));
    await unlink(filePath).catch(() => undefined);
  }

  private async verifyTransactionOwnership(transactionId: number, userId: number): Promise<void> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { account: true },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.account.userId !== userId) throw new ForbiddenException('Access denied');
  }
}
