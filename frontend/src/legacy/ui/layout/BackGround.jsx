import React from 'react'

const BackGround = () => {
  return (
    <div className="inset-0 bg-[#E5E7EB]">
      {/* Líneas decorativas */}
      <div className="absolute top-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute bottom-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute top-1/4 left-1/6 w-2/3 h-px bg-[#A9D0A2] transform rotate-135 z-0"></div>
    </div>
  )
}

export default BackGround
