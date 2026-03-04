// verify-otp.js
$(document).ready(function () {
    // Get email from URL
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (!email) {
        $('#verifyAlert').removeClass('d-none').addClass('alert-danger').text('Missing email. Please restart the process.');
        $('#verifyOtpForm').hide();
        return;
    }

    // Step 1: OTP Verification
    $('#verifyOtpForm').on('submit', function (e) {
        e.preventDefault();
        console.log('[LOG] Verify OTP button clicked');
        const otp = $('#otpCode').val().trim();
        if (!otp) {
            $('#verifyAlert').removeClass('d-none').addClass('alert-danger').text('Please enter the OTP code.');
            return;
        }
        // AJAX to verify OTP
        $.post('php/verify_otp.php', { email, otp }, function (res) {
            if (res.status === 'ok') {
                // Show change password form
                $('#verifyOtpForm').hide();
                $('#verifyAlert').removeClass('d-none').removeClass('alert-danger').addClass('alert-success').text('OTP verified! Please enter your new password.');
                $('#changePasswordSection').show();
            } else {
                $('#verifyAlert').removeClass('d-none').addClass('alert-danger').text(res.message || 'Invalid or expired OTP.');
            }
        }, 'json').fail(function () {
            $('#verifyAlert').removeClass('d-none').addClass('alert-danger').text('Server error. Please try again.');
        });
    });

    // Step 2: Change Password
    $('#changePasswordForm').on('submit', function (e) {
        e.preventDefault();
        console.log('[LOG] Change Password button clicked');
        const newPassword = $('#newPassword').val().trim();
        const confirmPassword = $('#confirmPassword').val().trim();
        if (!newPassword || !confirmPassword) {
            $('#changePasswordAlert').removeClass('d-none').addClass('alert-danger').text('Please fill in both password fields.');
            return;
        }
        if (newPassword.length < 6) {
            $('#changePasswordAlert').removeClass('d-none').addClass('alert-danger').text('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            $('#changePasswordAlert').removeClass('d-none').addClass('alert-danger').text('Passwords do not match.');
            return;
        }
        // AJAX to change password
        $.post('php/reset_pw.php', { email, newPassword }, function (res) {
            if (res.status === 'ok') {
                $('#changePasswordSection').hide();
                Swal.fire({
                    icon: 'success',
                    title: 'Password Changed!',
                    text: 'You can now log in with your new password.',
                    confirmButtonText: 'Go to Login'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            } else {
                $('#changePasswordAlert').removeClass('d-none').addClass('alert-danger').text(res.message || 'Failed to change password.');
            }
        }, 'json').fail(function () {
            $('#changePasswordAlert').removeClass('d-none').addClass('alert-danger').text('Server error. Please try again.');
        });
    });
});
