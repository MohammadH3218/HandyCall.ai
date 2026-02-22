import SwiftUI

private enum AuthMode: String, CaseIterable {
    case signIn = "Sign In"
    case signUp = "Create Account"
    case verifyEmail = "Verify Email"
    case forgotPassword = "Forgot Password"
    case resetPassword = "Reset Password"
}

struct LoginView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var sessionStore: SessionStore

    @State private var mode: AuthMode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var signupConfirmPassword = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var companyName = ""
    @State private var phoneNumber = ""
    @State private var verificationCode = ""
    @State private var resetCode = ""
    @State private var resetPassword = ""
    @State private var resetConfirmPassword = ""
    @State private var pendingVerificationEmail = ""
    @State private var pendingResetEmail = ""
    @State private var localError: String?
    @State private var isWorking = false
    @State private var toastText: String?

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 10) {
                Text("HandyCall")
                    .font(.largeTitle.weight(.bold))
                Text("AI Receptionist")
                    .font(.headline.weight(.medium))
                    .opacity(0.9)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .background(HandyCallTheme.topGradient)
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            .padding(.horizontal, 20)
            .padding(.top, 24)

            VStack(spacing: 14) {
                Picker("Auth mode", selection: $mode) {
                    Text(AuthMode.signIn.rawValue).tag(AuthMode.signIn)
                    Text(AuthMode.signUp.rawValue).tag(AuthMode.signUp)
                }
                .pickerStyle(.segmented)
                .onChange(of: mode) { _, _ in
                    localError = nil
                }

                formFields

                if let error = visibleError {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    performPrimaryAction()
                } label: {
                    HStack {
                        if isBusy {
                            ProgressView()
                                .controlSize(.small)
                                .tint(.white)
                        } else {
                            Text(primaryButtonTitle)
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(HandyCallTheme.emeraldDark, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .disabled(isPrimaryDisabled)

                authModeLinks
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(HandyCallTheme.canvas)
                    .shadow(color: .black.opacity(0.06), radius: 12, y: 6)
            )
            .padding(.horizontal, 20)
            .padding(.top, 18)

            Spacer(minLength: 0)
        }
        .overlay(alignment: .top) {
            if let toastText {
                ToastBanner(text: toastText)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: toastText)
        .background(Color(red: 0.95, green: 0.98, blue: 0.96).ignoresSafeArea())
    }

    private var formFields: some View {
        VStack(spacing: 12) {
            switch mode {
            case .signIn:
                emailField
                passwordField
                socialButtons
            case .signUp:
                emailField
                secureField("Password (8+ chars)", text: $password)
                secureField("Confirm password", text: $signupConfirmPassword)
                textField("First name", text: $firstName)
                textField("Last name", text: $lastName)
                textField("Company name (optional)", text: $companyName)
                textField("Phone (optional)", text: $phoneNumber, keyboard: .phonePad)
            case .verifyEmail:
                textField("Email", text: verificationEmailBinding, keyboard: .emailAddress)
                textField("Verification code", text: $verificationCode, keyboard: .numberPad)
            case .forgotPassword:
                emailField
            case .resetPassword:
                textField("Email", text: resetEmailBinding, keyboard: .emailAddress)
                textField("Reset code", text: $resetCode, keyboard: .asciiCapable)
                secureField("New password (8+ chars)", text: $resetPassword)
                secureField("Confirm new password", text: $resetConfirmPassword)
            }
        }
    }

    private var authModeLinks: some View {
        VStack(spacing: 10) {
            if mode == .signIn {
                Button("Forgot password?") {
                    localError = nil
                    mode = .forgotPassword
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HandyCallTheme.emeraldDark)
            }

            if mode == .verifyEmail {
                Button {
                    Task { await resendVerificationCode() }
                } label: {
                    Text("Resend verification code")
                        .font(.footnote.weight(.semibold))
                }
                .disabled(isBusy || verificationEmail.isEmpty)
                .foregroundStyle(HandyCallTheme.emeraldDark)
            }

            Button(secondaryButtonTitle) {
                localError = nil
                mode = secondaryMode
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var socialButtons: some View {
        VStack(spacing: 10) {
            Divider()
            socialButton(title: "Continue with Google", provider: .google)
            socialButton(title: "Continue with Apple", provider: .apple)
            Text("Native secure sign-in with your provider.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var emailField: some View {
        textField("Email", text: $email, keyboard: .emailAddress)
    }

    private var passwordField: some View {
        secureField("Password", text: $password)
    }

    private var visibleError: String? {
        if let localError, !localError.isEmpty {
            return localError
        }
        if mode == .signIn, let authError = sessionStore.authError, !authError.isEmpty {
            return authError
        }
        return nil
    }

    private var isBusy: Bool {
        isWorking || (mode == .signIn && sessionStore.isLoading)
    }

    private var primaryButtonTitle: String {
        switch mode {
        case .signIn:
            return "Sign In"
        case .signUp:
            return "Create Account"
        case .verifyEmail:
            return "Verify Email"
        case .forgotPassword:
            return "Send Reset Code"
        case .resetPassword:
            return "Reset Password"
        }
    }

    private var isPrimaryDisabled: Bool {
        if isBusy {
            return true
        }

        switch mode {
        case .signIn:
            return email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty
        case .signUp:
            return email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty || signupConfirmPassword.isEmpty
        case .verifyEmail:
            return verificationEmail.isEmpty || verificationCode.trimmingCharacters(in: .whitespaces).isEmpty
        case .forgotPassword:
            return email.trimmingCharacters(in: .whitespaces).isEmpty
        case .resetPassword:
            return resetEmail.isEmpty || resetCode.trimmingCharacters(in: .whitespaces).isEmpty || resetPassword.isEmpty || resetConfirmPassword.isEmpty
        }
    }

    private var secondaryMode: AuthMode {
        switch mode {
        case .signIn:
            return .signUp
        case .signUp:
            return .signIn
        case .verifyEmail:
            return .signIn
        case .forgotPassword:
            return .signIn
        case .resetPassword:
            return .signIn
        }
    }

    private var secondaryButtonTitle: String {
        switch mode {
        case .signIn:
            return "Need an account? Sign up"
        case .signUp:
            return "Already have an account? Sign in"
        case .verifyEmail:
            return "Back to sign in"
        case .forgotPassword:
            return "Back to sign in"
        case .resetPassword:
            return "Back to sign in"
        }
    }

    private var verificationEmail: String {
        pendingVerificationEmail.nonEmpty ?? email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var resetEmail: String {
        pendingResetEmail.nonEmpty ?? email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var verificationEmailBinding: Binding<String> {
        Binding(
            get: { verificationEmail },
            set: { pendingVerificationEmail = $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        )
    }

    private var resetEmailBinding: Binding<String> {
        Binding(
            get: { resetEmail },
            set: { pendingResetEmail = $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        )
    }

    private func textField(_ title: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        TextField(title, text: text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(keyboard)
            .padding(14)
            .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func secureField(_ title: String, text: Binding<String>) -> some View {
        SecureField(title, text: text)
            .padding(14)
            .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func socialButton(title: String, provider: SocialAuthProvider) -> some View {
        Button {
            Task { await signInWithSocial(provider) }
        } label: {
            Text(title)
                .font(.callout.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.black.opacity(0.08), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .foregroundStyle(HandyCallTheme.slate)
    }

    private func performPrimaryAction() {
        localError = nil
        switch mode {
        case .signIn:
            Task {
                await sessionStore.login(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password
                )
            }
        case .signUp:
            Task { await signUp() }
        case .verifyEmail:
            Task { await verifyEmail() }
        case .forgotPassword:
            Task { await requestPasswordReset() }
        case .resetPassword:
            Task { await confirmPasswordReset() }
        }
    }

    private func signUp() async {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard password == signupConfirmPassword else {
            localError = "Passwords do not match."
            return
        }
        guard password.count >= 8 else {
            localError = "Password must be at least 8 characters."
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            let response = try await container.apiClient.register(
                RegisterRequest(
                    companyName: companyName.nonEmpty,
                    serviceType: nil,
                    email: normalizedEmail,
                    password: password,
                    phoneNumber: phoneNumber.nonEmpty,
                    firstName: firstName.nonEmpty,
                    lastName: lastName.nonEmpty,
                    timezone: TimeZone.current.identifier
                )
            )
            pendingVerificationEmail = response.email ?? normalizedEmail
            verificationCode = ""
            password = ""
            signupConfirmPassword = ""
            mode = .verifyEmail
            showToast("Verification code sent to \(pendingVerificationEmail).")
        } catch {
            localError = error.localizedDescription
        }
    }

    private func verifyEmail() async {
        let code = verificationCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !verificationEmail.isEmpty, !code.isEmpty else {
            localError = "Email and verification code are required."
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            try await container.apiClient.confirmSignUp(email: verificationEmail, code: code)
            mode = .signIn
            email = verificationEmail
            showToast("Email verified. Sign in to continue.")
        } catch {
            localError = error.localizedDescription
        }
    }

    private func resendVerificationCode() async {
        guard !verificationEmail.isEmpty else {
            localError = "Enter your email first."
            return
        }
        isWorking = true
        defer { isWorking = false }

        do {
            try await container.apiClient.resendConfirmation(email: verificationEmail)
            showToast("Verification code resent.")
        } catch {
            localError = error.localizedDescription
        }
    }

    private func requestPasswordReset() async {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedEmail.isEmpty else {
            localError = "Email is required."
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            try await container.apiClient.requestPasswordReset(email: normalizedEmail)
            pendingResetEmail = normalizedEmail
            mode = .resetPassword
            showToast("Reset code sent. Check your email.")
        } catch {
            localError = error.localizedDescription
        }
    }

    private func confirmPasswordReset() async {
        let normalizedEmail = resetEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedCode = resetCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard resetPassword == resetConfirmPassword else {
            localError = "New passwords do not match."
            return
        }
        guard resetPassword.count >= 8 else {
            localError = "Password must be at least 8 characters."
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            try await container.apiClient.confirmPasswordReset(
                email: normalizedEmail,
                token: normalizedCode,
                newPassword: resetPassword
            )
            mode = .signIn
            email = normalizedEmail
            password = ""
            resetPassword = ""
            resetConfirmPassword = ""
            resetCode = ""
            showToast("Password updated. Sign in with your new password.")
        } catch {
            localError = error.localizedDescription
        }
    }

    private func signInWithSocial(_ provider: SocialAuthProvider) async {
        localError = nil
        isWorking = true
        defer { isWorking = false }

        do {
            let result = try await container.socialAuthManager.authenticate(with: provider)
            await sessionStore.completeSocialLogin(result)
            if let error = sessionStore.authError, !error.isEmpty {
                localError = error
            } else {
                showToast("Signed in with \(provider == .google ? "Google" : "Apple").")
            }
        } catch {
            localError = error.localizedDescription
        }
    }

    private func showToast(_ text: String) {
        toastText = text
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            withAnimation {
                toastText = nil
            }
        }
    }
}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
