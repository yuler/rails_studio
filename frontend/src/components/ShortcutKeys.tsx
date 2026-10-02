import React from 'react';
import { ShortcutId, shortcutLabel } from '../shortcuts';

export const ShortcutKeys: React.FC<{ id: ShortcutId; className?: string }> = ({ id, className }) => (
  <kbd className={className}>{shortcutLabel(id)}</kbd>
);
