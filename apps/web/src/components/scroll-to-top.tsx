import { useState, useEffect } from 'react'

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      onClick={scrollToTop}
      className="
        fixed bottom-6 right-6 z-40
        w-12 h-12
        bg-black hover:bg-slate-800
        text-white
        rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-in-out
        transform hover:scale-110
        flex items-center justify-center
        group
      "
      aria-label="Scroll to top"
    >
      <svg
        className="w-6 h-6 transition-transform duration-300 group-hover:-translate-y-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  )
}
