import { JwtUser } from '../common/decorators/current-user.decorator';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
export declare class WalletsController {
    private readonly walletsService;
    constructor(walletsService: WalletsService);
    findAll(accountId: number, user: JwtUser): Promise<{
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.WalletType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        sortOrder: number;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        currentBalance: import("@prisma/client/runtime/library").Decimal;
        includedInTotal: boolean;
        archived: boolean;
    }[]>;
    findOne(id: number, user: JwtUser): Promise<{
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.WalletType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        sortOrder: number;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        currentBalance: import("@prisma/client/runtime/library").Decimal;
        includedInTotal: boolean;
        archived: boolean;
    }>;
    create(dto: CreateWalletDto, user: JwtUser): Promise<{
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.WalletType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        sortOrder: number;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        currentBalance: import("@prisma/client/runtime/library").Decimal;
        includedInTotal: boolean;
        archived: boolean;
    }>;
    update(id: number, dto: UpdateWalletDto, user: JwtUser): Promise<{
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.WalletType;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        sortOrder: number;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        currentBalance: import("@prisma/client/runtime/library").Decimal;
        includedInTotal: boolean;
        archived: boolean;
    }>;
    delete(id: number, user: JwtUser): Promise<void>;
}
