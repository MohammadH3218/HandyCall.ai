import SwiftUI

@MainActor
final class LeadInboxViewModel: ObservableObject {
    @Published var leads: [LeadItem] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            leads = try await api.getLeads(limit: 100)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct LeadInboxView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel = LeadInboxViewModel()
    @State private var searchText = ""

    private var filtered: [LeadItem] {
        guard !searchText.isEmpty else { return viewModel.leads }
        return viewModel.leads.filter {
            $0.displayName.localizedCaseInsensitiveContains(searchText) ||
            ($0.phoneNumber?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.summary?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(0..<5, id: \.self) { _ in
                            LeadCardSkeleton()
                        }
                    }
                    .padding(HandyCallTheme.Spacing.screenPadding)
                }
            } else if let error = viewModel.error {
                HCErrorCard(text: error)
                    .padding(HandyCallTheme.Spacing.screenPadding)
            } else if filtered.isEmpty {
                HCEmptyState(
                    icon: "flame",
                    title: searchText.isEmpty ? "No leads yet" : "No results",
                    message: searchText.isEmpty
                        ? "Qualified leads from your calls will appear here."
                        : "Try a different search term."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        leadCountHeader
                        ForEach(Array(filtered.enumerated()), id: \.element.id) { index, lead in
                            LeadCard(lead: lead)
                                .staggeredAppearance(index: index)
                        }
                    }
                    .padding(HandyCallTheme.Spacing.screenPadding)
                }
            }
        }
        .background(HandyCallTheme.pageBackground.ignoresSafeArea())
        .navigationTitle("Lead Inbox")
        .searchable(text: $searchText, prompt: "Search leads")
        .task { await viewModel.load(using: container.apiClient) }
        .refreshable { await viewModel.load(using: container.apiClient) }
    }

    private var leadCountHeader: some View {
        HStack {
            Label("\(filtered.count) lead\(filtered.count == 1 ? "" : "s")", systemImage: "flame.fill")
                .font(HandyCallTheme.Typography.subhead)
                .foregroundStyle(.orange)
            Spacer()
        }
    }
}

// MARK: - Lead Card

private struct LeadCard: View {
    let lead: LeadItem

    var body: some View {
        VStack(alignment: .leading, spacing: HandyCallTheme.Spacing.md) {
            // Header row
            HStack(spacing: HandyCallTheme.Spacing.md) {
                AvatarView(name: lead.displayName, size: 44)

                VStack(alignment: .leading, spacing: 3) {
                    Text(lead.displayName)
                        .font(HandyCallTheme.Typography.headline)
                        .foregroundStyle(HandyCallTheme.slate)

                    if let phone = lead.phoneNumber {
                        Text(phone)
                            .font(HandyCallTheme.Typography.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Text(lead.stageLabel)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .foregroundStyle(lead.stageColor)
                    .background(lead.stageColor.opacity(0.12), in: Capsule())
            }

            // Summary
            if let summary = lead.summary?.nonEmpty {
                Text(summary)
                    .font(HandyCallTheme.Typography.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            // Lead reason
            if let reason = lead.leadReason?.nonEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "lightbulb.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                    Text(reason)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            // Footer metadata
            HStack(spacing: HandyCallTheme.Spacing.lg) {
                if let date = lead.createdDate {
                    Label(date.formatted(.dateTime.month(.abbreviated).day().hour().minute()),
                          systemImage: "clock")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                if let duration = lead.durationSeconds, duration > 0 {
                    Label(formatDuration(duration), systemImage: "timer")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Spacer()

                // Quick actions
                if let phone = lead.phoneNumber {
                    Button {
                        if let url = URL(string: "tel://\(phone.filter { $0.isNumber })") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        Image(systemName: "phone.fill")
                            .font(.caption)
                            .foregroundStyle(HandyCallTheme.emeraldFixed)
                            .frame(width: 32, height: 32)
                            .background(HandyCallTheme.emeraldLight, in: Circle())
                    }

                    Button {
                        if let url = URL(string: "sms:\(phone.filter { $0.isNumber })") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        Image(systemName: "message.fill")
                            .font(.caption)
                            .foregroundStyle(HandyCallTheme.info)
                            .frame(width: 32, height: 32)
                            .background(HandyCallTheme.info.opacity(0.12), in: Circle())
                    }
                }
            }
        }
        .padding(HandyCallTheme.Spacing.cardPadding)
        .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
        .cardShadow()
    }

    private func formatDuration(_ seconds: Double) -> String {
        let rounded = Int(seconds.rounded())
        let mins = rounded / 60
        let secs = rounded % 60
        return "\(mins)m \(secs)s"
    }
}

// MARK: - Skeleton

private struct LeadCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                ShimmerView(width: 44, height: 44, cornerRadius: 22)
                VStack(alignment: .leading, spacing: 6) {
                    ShimmerView(width: 130, height: 14)
                    ShimmerView(width: 90, height: 11)
                }
                Spacer()
                ShimmerView(width: 80, height: 22, cornerRadius: 11)
            }
            ShimmerView(height: 12)
            ShimmerView(width: 200, height: 12)
        }
        .padding(HandyCallTheme.Spacing.cardPadding)
        .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
    }
}
