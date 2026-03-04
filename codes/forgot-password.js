$(document).ready(function () {

    emailjs.init({ publicKey: "-xbRzNSapSs8iD-WK" });

    $("#forgotPasswordForm").on("submit", function (e) {
        e.preventDefault();
        console.log("[LOG] Send OTP button clicked");
        const email = $("#forgotEmail").val().trim();
        console.log("Email captured:", email);

        if (!email) {
            console.warn("No email entered");
            showAlert("danger", "Please enter your email.");
            return;
        }

        $.post("php/check_email.php", { email: email }, function (res) {
            console.log("check_email.php response:", res);

            if (res.status === "ok") {
                const otp = Math.floor(100000 + Math.random() * 900000);

                $.post("php/store_otp.php", { email: email, otp: otp }, function (storeRes) {
                    console.log("store_otp.php response:", storeRes);

                    if (storeRes.status === "ok") {
                        emailjs.send("service_b816d9f", "template_1yu5htt", {
                            to_name: storeRes.name,
                            otp_code: otp,
                            to_email: email
                        }).then(function () {
                            Swal.fire({
                                icon: "success",
                                title: "OTP Sent!",
                                text: "Check your email for the OTP code.",
                                confirmButtonText: "Proceed"
                            }).then(() => {
                                window.location.href = "verify-otp.html?email=" + encodeURIComponent(email);
                            });
                        }, function (error) {
                            console.error("EmailJS error:", error);
                            showAlert("danger", "Failed to send email. Try again.");
                        });
                    } else {
                        console.error("Failed to store OTP:", storeRes.message);
                        showAlert("danger", storeRes.message || "Failed to store OTP.");
                    }
                }, "json").fail(function (jqXHR, textStatus, errorThrown) {
                    console.error("AJAX error in store_otp.php:", textStatus, errorThrown);
                    showAlert("danger", "Server error. Please try again.");
                });

            } else if (res.status === "not_found") {
                showAlert("danger", "Email not found in our records.");
            } else {
                showAlert("danger", "Something went wrong. Please try again.");
            }

        }, "json").fail(function (jqXHR, textStatus, errorThrown) {
            console.error("AJAX error in check_email.php:", textStatus, errorThrown);
            showAlert("danger", "Server error. Please try again.");
        });
    });

    function showAlert(type, msg) {
        const alert = $("#forgotAlert");
        alert.removeClass("d-none alert-success alert-danger")
             .addClass("alert-" + type)
             .text(msg);
    }

    $("a[href='index.html']").on("click", function () {
        const email = $("#forgotEmail").val().trim();
        if (email) {
            $.post("php/delete_otp.php", { email: email });
        }
    });
});