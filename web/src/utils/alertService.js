import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export const alertService = {
  success(message, title = 'Success') {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'OK'
    })
  },

  error(message, title = 'Error') {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'OK'
    })
  },

  warning(message, title = 'Warning') {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'OK'
    })
  },

  info(message, title = 'Info') {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'OK'
    })
  },

  verificationCode(code, title = 'Verification Code') {
    return Swal.fire({
      icon: 'info',
      title,
      html: `
        <p>Your verification code is:</p>
        <div class="verification-code-box">${code}</div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Copy Code',
      cancelButtonText: 'Close',
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await navigator.clipboard.writeText(code)
        } catch {
          const fallbackInput = document.createElement('input')
          fallbackInput.value = code
          document.body.appendChild(fallbackInput)
          fallbackInput.select()
          document.execCommand('copy')
          document.body.removeChild(fallbackInput)
        }

        return Swal.fire({
          icon: 'success',
          title: 'Copied',
          text: 'Verification code copied to clipboard.',
          confirmButtonText: 'OK'
        })
      }

      return result
    })
  },

  confirm({ title = 'Confirm', text = '', confirmButtonText = 'Yes', cancelButtonText = 'Cancel' }) {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true
    })
  },

  input({
    title = 'Input',
    text = '',
    input = 'text',
    inputValue = '',
    inputPlaceholder = '',
    inputOptions = undefined,
    inputAttributes = {},
    confirmButtonText = 'Submit',
    cancelButtonText = 'Cancel',
    allowEmpty = false
  }) {
    return Swal.fire({
      title,
      text,
      input,
      inputValue,
      inputPlaceholder,
      inputOptions,
      inputAttributes,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      inputValidator: (value) => {
        if (!allowEmpty && input === 'text' && value === '') {
          return 'Please enter a value.'
        }
        return null
      }
    })
  }
}
