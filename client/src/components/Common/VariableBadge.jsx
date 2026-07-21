// client/src/components/Common/VariableBadge.jsx

import Tooltip from '../Tooltip';
import { getVariableDescription } from './variableDescriptions';
import './VariableBadge.css';

function VariableBadge({ name, className = '', description }) {
  const normalized = String(name || '').replace(/[{}]/g, '');

  return (
    <Tooltip text={getVariableDescription(normalized, description)}>
      <code className={`variable-badge ${className}`.trim()}>{`{${normalized}}`}</code>
    </Tooltip>
  );
}

export function VariableBadges({ variables = [], className = '', descriptions = {} }) {
  return (
    <span className={`variable-badges ${className}`.trim()}>
      {variables.map((name) => (
        <VariableBadge
          key={name}
          name={name}
          description={descriptions[name]}
        />
      ))}
    </span>
  );
}

export default VariableBadge;
