"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads/' });
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: [
            /^http:\/\/localhost:\d+$/,
            'https://money-manager-web-app.vercel.app',
            'https://localhost',
            'capacitor://localhost',
            ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
        ],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map