import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var sessionStore: SessionStore
    @EnvironmentObject private var container: AppContainer

    var body: some View {
        NavigationStack {
            List {
                Section("Account") {
                    row("Business", value: sessionStore.company?.companyName ?? "Not loaded")
                    row("Email", value: sessionStore.session?.email ?? "Unknown")
                    row("Timezone", value: sessionStore.company?.timezone ?? "Not set")
                }

                Section("Notifications") {
                    NavigationLink {
                        NotificationPreferencesView()
                            .environmentObject(container)
                    } label: {
                        Label("Manage notification settings", systemImage: "bell.badge")
                    }
                }

                Section("Session") {
                    Button(role: .destructive) {
                        sessionStore.logout()
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }

    private func row(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.trailing)
        }
        .font(.subheadline)
    }
}
