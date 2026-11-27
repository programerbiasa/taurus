import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryBrand } from './InventoryBrand';

@Entity('inventory_types')
export class InventoryType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', nullable: true })
  brand_id?: number | null;

  @ManyToOne(() => InventoryBrand, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'brand_id' })
  brand?: InventoryBrand | null;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
