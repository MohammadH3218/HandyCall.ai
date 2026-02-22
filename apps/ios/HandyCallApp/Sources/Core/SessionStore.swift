import Foundation
import SwiftUI

@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var session: AuthSession?
    @Published private(set) var company: Company?
    @Published var isLoading = false
    @Published var authError: String?

    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
        restore()
    }

    var isAuthenticated: Bool {
        session != nil
    }

    func login(email: String, password: String) async {
        isLoading = true
        authError = nil
        defer { isLoading = false }

        do {
            let response = try await apiClient.login(email: email, password: password)
            let resolvedEmail = response.email ?? email
            let auth = AuthSession(
                accessToken: response.accessToken,
                idToken: response.idToken,
                refreshToken: response.refreshToken,
                email: resolvedEmail
            )
            apply(session: auth)
            company = try await apiClient.getMyCompany()
        } catch {
            authError = error.localizedDescription
        }
    }

    func refreshCompany() async {
        guard session != nil else { return }
        do {
            company = try await apiClient.getMyCompany()
        } catch {
            // Keep previous company data on transient refresh failures.
        }
    }

    func logout() {
        session = nil
        company = nil
        apiClient.setBearerToken(nil)
        KeychainStore.remove("id_token")
        KeychainStore.remove("access_token")
        KeychainStore.remove("refresh_token")
        KeychainStore.remove("email")
    }

    private func restore() {
        guard
            let idToken = KeychainStore.load("id_token"),
            let accessToken = KeychainStore.load("access_token"),
            let email = KeychainStore.load("email")
        else { return }

        let restored = AuthSession(
            accessToken: accessToken,
            idToken: idToken,
            refreshToken: KeychainStore.load("refresh_token"),
            email: email
        )
        apply(session: restored)
    }

    private func apply(session: AuthSession) {
        self.session = session
        apiClient.setBearerToken(session.idToken)
        KeychainStore.save(session.idToken, for: "id_token")
        KeychainStore.save(session.accessToken, for: "access_token")
        KeychainStore.save(session.email, for: "email")
        if let refresh = session.refreshToken {
            KeychainStore.save(refresh, for: "refresh_token")
        }
    }
}
