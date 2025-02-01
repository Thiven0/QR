import PropTypes from 'prop-types';

const Input = ({ type, value, onChange, placeholder }) => (
  <div>
    <label className="block text-[#00594e]">{placeholder}</label>
    <input
      type={type}
      className="w-full p-3 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054E]"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

Input.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
};

export default Input;
