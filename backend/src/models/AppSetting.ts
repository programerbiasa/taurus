import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('app_settings')
export class AppSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  setting_key!: string;

  @Column({ type: 'text', nullable: true })
  setting_value?: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
