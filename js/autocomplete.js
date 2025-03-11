$(document).ready(function () {
    const $competitorName = $("#competitorName");
    const $actionButton = $("#actionButton");
    const $additionalFields = $("#additionalFields");
    const $ageGroup = $("#ageGroup");
    const $village = $("#village");
    const $email = $("#email");
    const $telephone = $("#telephone");
    const $competitorId = $("#competitorId");
    const $eventId = $("#eventId");
    const csrfToken = $("input[name='_csrf']").val();
    const $alertContainer = $("<div id='alert-container' class='mt-3'></div>").prependTo(".card-body");

    let formInteracted = false;
    let isSubmitting = false;

    // Disable Enter key on the form
    $("#registrationForm").on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
        }
    });

    // Show Bootstrap Alert
    function showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $alertContainer.html(alertHtml);
    }

    $competitorName.autocomplete({
        source: function (request, response) {
            if (request.term.length < 3) return;
            $.ajax({
                url: "/api/public/competitors/search",
                type: "GET",
                data: { query: request.term },
                success: function (data) {
                    response(data);
                },
                error: function () {
                    response([]);
                }
            });
        },
        select: function (event, ui) {
            $competitorId.val(ui.item.id);
            $additionalFields.hide();
            showAlert("success", "Allt ser bra ut för registrering");
            $actionButton.text("Skicka in").off("click").on("click", submitForm).prop("disabled", false);
        },
        minLength: 3
    });

    $competitorName.on("input", function () {
        $competitorId.val(""); // Clear autocomplete selection
        $additionalFields.hide();
        updateActionButtonState();
    });

    function updateActionButtonState() {
        if (isSubmitting) return;

        const isCompetitorIdSet = !!$competitorId.val();
        const isFormComplete =
            $competitorName.val() &&
            $ageGroup.val() &&
            $village.val() &&
            validateEmail($email.val()) &&
            validateTelephone($telephone.val());

        if (isCompetitorIdSet) {
            // Competitor selected via autocomplete
            $actionButton.text("Skicka in").prop("disabled", false).off("click").on("click", submitForm);
            showAlert("success", "Allt ser bra ut för registrering");
        } else if ($competitorName.val() && !isCompetitorIdSet && formInteracted) {
            // Additional fields are visible for manual input
            validateAdditionalFields();
        } else if ($competitorName.val() && !isCompetitorIdSet) {
            // Show "Nästa" if competitorName is filled but no competitorId is set
            $actionButton.text("Nästa").prop("disabled", false).off("click").on("click", showAdditionalFields);
        } else {
            $actionButton.prop("disabled", true);
        }
    }

    function showAdditionalFields() {
        formInteracted = true;
        $additionalFields.show();
        updateActionButtonState();
    }

    function validateAdditionalFields() {
        const missingFields = [];
        const email = $email.val();
        const telephone = $telephone.val();

        if (!$competitorName.val()) missingFields.push("Namn på åkare");
        if (!$ageGroup.val()) missingFields.push("Ålderskategori");
        if (!$village.val()) missingFields.push("By");
        if (!validateEmail(email)) missingFields.push("E-post (ogiltigt format)");
        if (!validateTelephone(telephone)) missingFields.push("Telefon (ogiltigt format)");

        if (missingFields.length > 0) {
            showAlert("info", `Följande fält saknas eller har ogiltigt format: ${missingFields.join(", ")}`);
            $actionButton.prop("disabled", true);
        } else {
            showAlert("success", "Allt ser bra ut för registrering");
            $actionButton.text("Skicka in").prop("disabled", false).off("click").on("click", submitForm);
        }
    }

    function validateFields() {
        const isCompetitorIdSet = !!$competitorId.val();
        if (isCompetitorIdSet) {
            return true; // Skip additional fields validation if competitorId is set
        }

        const missingFields = [];
        const email = $email.val();
        const telephone = $telephone.val();

        if (!$competitorName.val()) missingFields.push("Namn på åkare");
        if (!$ageGroup.val()) missingFields.push("Ålderskategori");
        if (!$village.val()) missingFields.push("By");
        if (!validateEmail(email)) missingFields.push("E-post (ogiltigt format)");
        if (!validateTelephone(telephone)) missingFields.push("Telefon (ogiltigt format)");

        if (missingFields.length > 0) {
            showAlert("info", `Följande fält saknas eller har ogiltigt format: ${missingFields.join(", ")}`);
            return false;
        }
        return true;
    }

function submitForm() {
    if (isSubmitting) return;

    if (!validateFields()) {
        return;
    }

    isSubmitting = true;

    const payload = $competitorId.val()
        ? {
              competitorId: $competitorId.val(),
              eventId: $eventId.val(),
              onSiteSwitch: $("#onSiteSwitch").is(":checked"),
              _csrf: csrfToken
          }
        : {
              name: $competitorName.val(),
              ageGroup: $ageGroup.val(),
              village: $village.val(),
              email: $email.val(),
              telephone: $telephone.val(),
              eventId: $eventId.val(),
              onSiteSwitch: $("#onSiteSwitch").is(":checked"),
              _csrf: csrfToken
          };

$.ajax({
    url: "/api/public/competitors/register",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(payload),
    success: function (response) {
        // Assuming the response is a string
        showAlert("success", response);
        resetForm();
        isSubmitting = false;
    },
    error: function (xhr) {
        isSubmitting = false;
        try {
            const jsonResponse = JSON.parse(xhr.responseText);
            const userFriendlyMessage = jsonResponse.message || "Ett fel uppstod.";
            showAlert("info", `Fel: ${userFriendlyMessage}`);
        } catch (e) {
            showAlert("info", "Ett oväntat fel uppstod.");
        }
    }
});
}

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validateTelephone(telephone) {
        const sanitized = telephone.replace(/[\s-]/g, "");
        return /^\d+$/.test(sanitized);
    }

    function resetForm() {
        $competitorName.val("");
        $competitorId.val("");
        $ageGroup.val("");
        $village.val("");
        $email.val("");
        $telephone.val("");
        $additionalFields.hide();
        formInteracted = false;
        updateActionButtonState();
    }

    $ageGroup.on("change", updateActionButtonState);
    $village.on("change", updateActionButtonState);
    $email.on("input", updateActionButtonState);
    $telephone.on("input", updateActionButtonState);
});
