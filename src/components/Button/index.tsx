import type { ButtonHTMLAttributes } from 'react';
import './styles.css';

export type ButtonVariant = 'icon' | 'round' | 'roundActive' | 'chip';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  icon: 'icon-btn',
  round: 'btn-round',
  roundActive: 'btn-round btn-round-active',
  chip: 'btn-chip',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'icon', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={[VARIANT_CLASS[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}

export function IconButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="icon" {...props} />;
}
