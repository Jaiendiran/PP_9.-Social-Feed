import React from 'react';
import styles from './PostForm.module.css';

function PostForm({ title, content, isEditing, setTitle, setContent, errors }) {
    return (
        <form className={styles.form}>
            <input
                className={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Title"
                readOnly={!isEditing}
            />
            {errors.title && <p className={styles.error}>{errors.title}</p>}
            <textarea
                className={styles.textarea}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Content"
                readOnly={!isEditing}
            />
            {errors.content && <p className={styles.error}>{errors.content}</p>}
        </form>
    );
}

export default PostForm;
