import { useEffect } from 'react'
import Button from './Button';
import { createPortal } from 'react-dom'
// This component receives an image URL and a function to call when it should close.
// It doesn't manage its own state — the PARENT owns activeImage/setActiveImage,
// and just tells this component what to show and what to do on close.

const ImageLightbox = ({ imageUrl, onClose }) => {

  // TODO 1: This effect should listen for the Escape key while the lightbox is open,
  // and call onClose() when Escape is pressed.
  // Hint: window.addEventListener('keydown', ...) inside useEffect,
  // and don't forget to clean up with removeEventListener in the return function.
  useEffect(() => {
    // your code here

     // 1. define a function that: if the key pressed was Escape, call onClose
          const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
  // 2. tell the window to run that function whenever a key goes down
        window.addEventListener('keydown', handleKeyDown);
  // 3. when this effect is cleaned up, tell the window to stop running that function
        return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose])

  // TODO 2: if there's no imageUrl, this component should render nothing at all.
  // (return null)
  if(!imageUrl) return null;

  return createPortal(
    <div
      // TODO 3: give this the backdrop styling — fixed position, covers whole screen,
      // semi-transparent dark background, centers its children.
      // Also: clicking this outer div (the backdrop) should call onClose().
    onClick={onClose}
        style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
  }}
    >
    <div style={{position:'relative'}}>

      <img
        src={imageUrl}
        alt="Enlarged view"
        // TODO 4: this is the tricky one. If someone clicks the IMAGE itself,
        // it should NOT close the lightbox (only clicking the backdrop should).
        // Think about event bubbling — what method on the click event stops
        // a click from also triggering the parent div's onClick?
        onClick={(event) => event.stopPropagation() }
style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',display:'block' }}      />

      <button onClick={onClose} style={{position: 'absolute', top:'-30px',right:'-20px'}}>X</button>
   </div>
    </div>,
    document.body
  )
}

export default ImageLightbox