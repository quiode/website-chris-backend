import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Videos {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  hash: string;

  @Column({ unique: true })
  position: number;

  @Column('uuid')
  picture1Id: string;

  @Column('uuid')
  picture2Id: string;

  @Column('uuid')
  picture3Id: string;

  @Column()
  line1: string;

  @Column()
  line2: string;

  @Column()
  url: string;
}
