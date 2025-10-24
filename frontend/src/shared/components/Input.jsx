import PropTypes from 'prop-types';

const Input = ({ type, value, onChange, placeholder, name, ...rest }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-[#00594e]">{placeholder}</span>
    <input
      type={type}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f172a] shadow-sm transition placeholder:text-slate-400 focus:border-[#00594e] focus:outline-none focus:ring-2 focus:ring-[#00594e]/70"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      {...rest}
    />
  </label>
);

Input.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  name: PropTypes.string,
};

export default Input;
