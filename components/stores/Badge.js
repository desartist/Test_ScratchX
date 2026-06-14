'use client';

import PropTypes from 'prop-types';
import styles from './Badge.module.css';

export default function Badge({ label, variant = 'default' }) {
  return (
    <div className={`${styles.badge} ${styles[variant]}`}>
      {label}
    </div>
  );
}

Badge.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['default', 'success', 'warning', 'danger', 'info']),
};
