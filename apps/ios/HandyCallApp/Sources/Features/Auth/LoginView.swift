import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var sessionStore: SessionStore
    @State private var email = ""
    @State private var password = ""

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
                TextField("Email", text: $email)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.emailAddress)
                    .padding(14)
                    .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                SecureField("Password", text: $password)
                    .padding(14)
                    .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                if let error = sessionStore.authError, !error.isEmpty {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task {
                        await sessionStore.login(email: email.trimmingCharacters(in: .whitespaces), password: password)
                    }
                } label: {
                    HStack {
                        if sessionStore.isLoading {
                            ProgressView()
                                .controlSize(.small)
                                .tint(.white)
                        } else {
                            Text("Sign In")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(HandyCallTheme.emeraldDark, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .disabled(sessionStore.isLoading || email.isEmpty || password.isEmpty)
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
        .background(Color(red: 0.95, green: 0.98, blue: 0.96).ignoresSafeArea())
    }
}
