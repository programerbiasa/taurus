import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryItem } from './InventoryItem';
import { InventoryLocation } from './InventoryLocation';
import { InventoryPic } from './InventoryPic';

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  item_id!: number;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'item_id' })
  item?: InventoryItem;

  @Column({ type: 'enum', enum: ['masuk', 'keluar', 'mutasi', 'kembali'] })
  transaction_type!: 'masuk' | 'keluar' | 'mutasi' | 'kembali';

  @Column({ type: 'datetime' })
  transaction_date!: Date;

  @Column({ type: 'int', nullable: true })
  from_location_id?: number | null;

  @ManyToOne(() => InventoryLocation, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'from_location_id' })
  from_location?: InventoryLocation | null;

  @Column({ type: 'int', nullable: true })
  to_location_id?: number | null;

  @ManyToOne(() => InventoryLocation, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'to_location_id' })
  to_location?: InventoryLocation | null;

  @Column({ type: 'int', nullable: true })
  from_pic_id?: number | null;

  @ManyToOne(() => InventoryPic, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'from_pic_id' })
  from_pic?: InventoryPic | null;

  @Column({ type: 'int', nullable: true })
  to_pic_id?: number | null;

  @ManyToOne(() => InventoryPic, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'to_pic_id' })
  to_pic?: InventoryPic | null;

  @Column({ type: 'enum', enum: ['Baik', 'Rusak', 'Hilang', 'Scrap'], default: 'Baik' })
  condition_status!: 'Baik' | 'Rusak' | 'Hilang' | 'Scrap';

  @Column({ type: 'varchar', length: 100, nullable: true })
  recipient_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  doc_number?: string; // No BAST / No Surat Jalan

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'int', nullable: true })
  operator_id?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  operator_name?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
