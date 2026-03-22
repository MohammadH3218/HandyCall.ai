import SwiftUI

struct MoreMenuView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var sessionStore: SessionStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: HandyCallTheme.Spacing.lg) {
                    profileCard
                    menuSection(title: "Manage", items: manageItems)
                    menuSection(title: "Business", items: businessItems)
                    menuSection(title: "Account", items: accountItems)
                    signOutButton
                    versionFooter
                }
                .padding(HandyCallTheme.Spacing.screenPadding)
            }
            .background(HandyCallTheme.pageBackground.ignoresSafeArea())
            .navigationTitle("More")
        }
    }

    // MARK: - Profile Card

    private var profileCard: some View {
        HStack(spacing: HandyCallTheme.Spacing.lg) {
            ZStack(alignment: .bottomTrailing) {
                AvatarView(
                    name: sessionStore.company?.companyName ?? sessionStore.session?.email ?? "U",
                    size: 56
                )
                Circle()
                    .fill(HandyCallTheme.emeraldFixed)
                    .frame(width: 16, height: 16)
                    .overlay(Circle().stroke(HandyCallTheme.surfaceWhite, lineWidth: 2.5))
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(sessionStore.company?.companyName ?? "Your Business")
                    .font(HandyCallTheme.Typography.headline)
                    .foregroundStyle(HandyCallTheme.slate)

                Text(sessionStore.session?.email ?? "")
                    .font(HandyCallTheme.Typography.caption)
                    .foregroundStyle(.secondary)

                if let serviceType = sessionStore.company?.serviceType, !serviceType.isEmpty {
                    Text(serviceType.capitalized)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .foregroundStyle(HandyCallTheme.emeraldDarkFixed)
                        .background(HandyCallTheme.emeraldLight, in: Capsule())
                }
            }

            Spacer()
        }
        .padding(HandyCallTheme.Spacing.cardPadding)
        .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.xl, style: .continuous))
        .cardShadow()
    }

    // MARK: - Menu Items

    private var manageItems: [MenuItem] {
        [
            MenuItem(icon: "person.2.fill", title: "Contacts", subtitle: "Manage your customers", color: HandyCallTheme.emeraldFixed) {
                AnyView(ContactsView())
            },
            MenuItem(icon: "flame.fill", title: "Lead Inbox", subtitle: "Qualified leads ready to follow up", color: .orange) {
                AnyView(LeadInboxView())
            },
            MenuItem(icon: "bell.fill", title: "Notifications", subtitle: "Alerts and activity", color: HandyCallTheme.warning) {
                AnyView(NotificationsView().environmentObject(container))
            },
        ]
    }

    private var businessItems: [MenuItem] {
        [
            MenuItem(icon: "doc.text.fill", title: "Invoices", subtitle: "Create and manage invoices", color: HandyCallTheme.info) {
                AnyView(InvoicesView())
            },
            MenuItem(icon: "brain.head.profile", title: "Knowledge Base", subtitle: "FAQs, services and policies", color: .purple) {
                AnyView(KnowledgeView().environmentObject(container))
            },
            MenuItem(icon: "bolt.fill", title: "Automations", subtitle: "Follow-ups and review requests", color: HandyCallTheme.emeraldFixed) {
                AnyView(AutomationSettingsExternalView().environmentObject(container).environmentObject(sessionStore))
            },
            MenuItem(icon: "chart.bar.fill", title: "Usage", subtitle: "Minutes, messages and contacts", color: HandyCallTheme.info) {
                AnyView(UsageView().environmentObject(container))
            },
        ]
    }

    private var accountItems: [MenuItem] {
        [
            MenuItem(icon: "gearshape.fill", title: "Settings", subtitle: "Appearance, notifications, account", color: .gray) {
                AnyView(SettingsView())
            },
        ]
    }

    // MARK: - Menu Section

    private func menuSection(title: String, items: [MenuItem]) -> some View {
        VStack(alignment: .leading, spacing: HandyCallTheme.Spacing.sm) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    NavigationLink {
                        item.destination()
                    } label: {
                        HStack(spacing: HandyCallTheme.Spacing.md) {
                            Image(systemName: item.icon)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 34, height: 34)
                                .background(item.color.gradient, in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.title)
                                    .font(HandyCallTheme.Typography.subhead)
                                    .foregroundStyle(HandyCallTheme.slate)
                                Text(item.subtitle)
                                    .font(HandyCallTheme.Typography.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.quaternary)
                        }
                        .padding(.horizontal, HandyCallTheme.Spacing.cardPadding)
                        .padding(.vertical, 13)
                    }
                    .buttonStyle(.plain)

                    if index < items.count - 1 {
                        Divider()
                            .padding(.leading, 62)
                    }
                }
            }
            .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
            .cardShadow()
        }
    }

    // MARK: - Sign Out

    private var signOutButton: some View {
        Button(role: .destructive) {
            sessionStore.logout()
        } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Sign Out")
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(HandyCallTheme.destructive.opacity(0.08), in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
        }
        .foregroundStyle(HandyCallTheme.destructive)
    }

    // MARK: - Version Footer

    private var versionFooter: some View {
        Text("HandyCall v\(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")")
            .font(.caption2)
            .foregroundStyle(.quaternary)
            .frame(maxWidth: .infinity)
            .padding(.bottom, HandyCallTheme.Spacing.lg)
    }
}

// MARK: - MenuItem

private struct MenuItem {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let destination: () -> AnyView
}

// MARK: - External Automation View Wrapper

struct AutomationSettingsExternalView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var sessionStore: SessionStore

    @StateObject private var viewModel = AutomationSettingsVM()

    var body: some View {
        Form {
            Section("Follow-up sequences") {
                Toggle("Enable follow-up SMS", isOn: $viewModel.followUpEnabled)
                    .disabled(viewModel.isStarterPlan)

                if viewModel.isStarterPlan {
                    Text("Follow-up sequences are available on Pro and Max plans.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Sends a sequence after calls when no booking is created.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Review requests") {
                Toggle("Enable review requests", isOn: $viewModel.reviewEnabled)

                HStack {
                    Text("Delay (minutes)")
                    Spacer()
                    TextField("120", text: $viewModel.reviewDelayMinutes)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 90)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Review URL")
                    TextField("https://...", text: $viewModel.reviewPlatformURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Review message template")
                    TextEditor(text: $viewModel.reviewTemplate)
                        .frame(minHeight: 90)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                        )
                }
            }

            if let error = viewModel.error {
                Section {
                    HCErrorCard(text: error)
                }
            }

            if let success = viewModel.successMessage {
                Section {
                    Text(success)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(HandyCallTheme.emeraldFixed)
                }
            }
        }
        .navigationTitle("Automations")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await viewModel.save(using: container.apiClient, sessionStore: sessionStore) }
                } label: {
                    if viewModel.isSaving {
                        ProgressView()
                    } else {
                        Text("Save").fontWeight(.semibold)
                    }
                }
                .disabled(viewModel.isSaving)
            }
        }
        .onAppear {
            viewModel.load(from: sessionStore.company)
        }
    }
}

@MainActor
private final class AutomationSettingsVM: ObservableObject {
    @Published var followUpEnabled = false
    @Published var reviewEnabled = false
    @Published var reviewDelayMinutes = "120"
    @Published var reviewPlatformURL = ""
    @Published var reviewTemplate = ""
    @Published var isSaving = false
    @Published var error: String?
    @Published var successMessage: String?
    @Published var isStarterPlan = false

    func load(from company: Company?) {
        followUpEnabled = company?.followUpSequencesEnabled == true
        reviewEnabled = company?.reviewRequestEnabled == true
        reviewDelayMinutes = String(company?.reviewRequestDelayMinutes ?? 120)
        reviewPlatformURL = company?.reviewPlatformURL ?? ""
        reviewTemplate = company?.reviewRequestTemplate ?? ""
        isStarterPlan = (company?.subscriptionPlan ?? "").uppercased() == "STARTER"
    }

    func save(using api: APIClient, sessionStore: SessionStore) async {
        isSaving = true
        error = nil
        defer { isSaving = false }

        let parsedDelay = max(0, Int(reviewDelayMinutes.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 120)

        do {
            _ = try await api.updateMyCompanyAutomation(
                followUpSequencesEnabled: followUpEnabled,
                reviewRequestEnabled: reviewEnabled,
                reviewRequestDelayMinutes: parsedDelay,
                reviewPlatformURL: reviewPlatformURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : reviewPlatformURL,
                reviewRequestTemplate: reviewTemplate.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : reviewTemplate
            )
            await sessionStore.refreshCompany()
            withAnimation(.easeOut(duration: 0.2)) {
                successMessage = "Automation settings saved"
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                withAnimation(.easeIn(duration: 0.2)) {
                    self.successMessage = nil
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
