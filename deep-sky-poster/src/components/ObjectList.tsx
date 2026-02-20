import type { DeepSkyObject, ObjectWithDistance } from '../types';
import styles from './ObjectList.module.css';

interface Props {
  mainObject: DeepSkyObject;
  mainDistance: number;
  others: ObjectWithDistance[];
}

function ObjectRow({
  obj,
  distance,
  isMain,
}: {
  obj: DeepSkyObject;
  distance: number;
  isMain?: boolean;
}) {
  return (
    <div className={`${styles.row} ${isMain ? styles.mainRow : ''}`}>
      <div className={styles.rowLeft}>
        <div className={styles.rowId}>{obj.id}</div>
        <div className={styles.rowClass}>{obj.normalizedClass}</div>
      </div>
      <div className={styles.rowMiddle}>
        <div className={styles.rowName}>{obj.name}</div>
        <div className={styles.rowSub}>
          {obj.constellation} · {obj.objectType}
          {obj.magnitude !== null ? ` · mag ${obj.magnitude.toFixed(1)}` : ''}
        </div>
        <div className={styles.rowCoords}>
          RA {obj.raRaw} · Dec {obj.decRaw}
        </div>
      </div>
      <div className={styles.rowDist}>
        <span className={styles.distValue}>{distance.toFixed(2)}°</span>
        <span className={styles.distLabel}>separation</span>
      </div>
    </div>
  );
}

export default function ObjectList({ mainObject, mainDistance, others }: Props) {
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Selected deep-sky objects</span>
        <span className={styles.headerSub}>Angular distance from derived coordinate</span>
      </div>

      <ObjectRow obj={mainObject} distance={mainDistance} isMain />

      {others.map(({ object, distance }) => (
        <ObjectRow key={object.id} obj={object} distance={distance} />
      ))}
    </div>
  );
}
