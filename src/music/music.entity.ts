import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Music {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  hash: string;

  @Column()
  url: string;

  @Column({ unique: true })
  position: number;

  @Column('uuid')
  pictureId: string;
}
