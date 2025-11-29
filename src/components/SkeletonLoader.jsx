import styles from './SkeletonLoader.module.css';

function SkeletonLoader({ count = 5 }) {
    return (
        <div className={styles.skeletonContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.skeletonCard}>
                    <div className={styles.skeletonCheckbox}></div>
                    <div className={styles.skeletonContent}>
                        <div className={styles.skeletonTitle}></div>
                        <div className={styles.skeletonText}></div>
                        <div className={styles.skeletonText}></div>
                        <div className={styles.skeletonDate}></div>
                    </div>
                    <div className={styles.skeletonIcon}></div>
                </div>
            ))}
        </div>
    );
}

export default SkeletonLoader;
