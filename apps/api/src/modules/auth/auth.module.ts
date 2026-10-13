
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');

        if (
          secret.includes('REEMPLAZAR') ||
          Buffer.byteLength(secret, 'utf8') < 32
        ) {
          throw new Error(
            'JWT_SECRET debe ser un secreto aleatorio de al menos 32 bytes.',
          );
        }

        return {
          secret,
          signOptions: {
            algorithm: 'HS256' as const,
            expiresIn: '1h' as const,
            issuer: 'panaderia-api',
            audience: 'panaderia-platform',
          },
          verifyOptions: {
            algorithms: ['HS256'] as ['HS256'],
            issuer: 'panaderia-api',
            audience: 'panaderia-platform',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
