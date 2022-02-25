import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Stills {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  hash: string;

  @Column({ unique: true })
  position: number;
}
