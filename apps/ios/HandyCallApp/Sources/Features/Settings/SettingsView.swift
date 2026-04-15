import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var sessionStore: SessionStore
    @EnvironmentObject private var container: AppContainer

    var body: some View {
        List {
            // Account info
            Section("Account") {
                HCKeyValueRow(
                    title: "Business",
                    value: sessionStore.company?.companyName ?? "Not loaded",
                    icon: "building.2.fill"
                )
                HCKeyValueRow(
                    title: "Email",
                    value: sessionStore.session?.email ?? "Unknown",
                    icon: "envelope.fill"
                )
                HCKeyValueRow(
                    title: "Timezone",
                    value: sessionStore.company?.timezone ?? "Not set",
                    icon: "globe"
                )
            }

            // Appearance
            Section("Appearance") {
                AppearancePicker()
                    .environmentObject(container.appearanceManager)
            }

            // Notifications
            Section("Notifications") {
                NavigationLink {
                    NotificationsView()
                        .environmentObject(container)
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Notification Center")
                                .foregroundStyle(HandyCallTheme.slate)
                            Text("View all alerts and activity")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "bell.fill")
                            .foregroundStyle(HandyCallTheme.warning)
                    }
                }

                NavigationLink {
                    NotificationPreferencesView()
                        .environmentObject(container)
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Notification Settings")
                                .foregroundStyle(HandyCallTheme.slate)
                            Text("In-app and push preferences")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "bell.badge.fill")
                            .foregroundStyle(HandyCallTheme.warning)
                    }
                }
            }

            // About
            Section("About") {
                HStack {
                    Label("Version", systemImage: "info.circle")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                        .foregroundStyle(.secondary)
                }
                .font(.subheadline)
            }
        }
        .navigationTitle("Settings")
    }
}

// MARK: - Appearance Picker

private struct AppearancePicker: View {
    @EnvironmentObject private var appearanceManager: AppearanceManager

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Theme")
                .font(HandyCallTheme.Typography.subhead)
                .foregroundStyle(HandyCallTheme.slate)

            HStack(spacing: 0) {
                ForEach(AppearanceMode.allCases, id: \.rawValue) { mode in
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            appearanceManager.mode = mode
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: mode.icon)
                                .font(.system(size: 13, weight: .semibold))
                            Text(mode.rawValue)
                                .font(.subheadline.weight(.medium))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .foregroundStyle(appearanceManager.mode == mode ? .white : HandyCallTheme.slate)
                        .background(
                            appearanceManager.mode == mode
                                ? AnyShapeStyle(HandyCallTheme.emeraldFixed.gradient)
                                : AnyShapeStyle(.clear),
                            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(3)
            .background(HandyCallTheme.surfaceGray, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(.vertical, 4)
    }
}
