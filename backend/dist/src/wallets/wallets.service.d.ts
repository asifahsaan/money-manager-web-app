import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from '@prisma/client';
export declare class WalletsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllByAccount(accountId: number, userId: number): Promise<Wallet[]>;
    findOne(id: number, userId: number): Promise<Wallet>;
    create(userId: number, dto: CreateWalletDto): Promise<Wallet>;
    createDefault(accountId: number): Promise<Wallet>;
    update(id: number, userId: number, dto: UpdateWalletDto): Promise<Wallet>;
    delete(id: number, userId: number): Promise<void>;
    private verifyAccountOwnership;
}
