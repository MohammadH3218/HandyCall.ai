import SwiftUI

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var overview: DashboardOverview?
    @Published var isLoading = false
    @Published var error: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            overview = try await api.getDashboardStats()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var sessionStore: SessionStore
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: HandyCallTheme.Spacing.xl) {
                    hero

                    if viewModel.isLoading {
                        DashboardSkeleton()
                    } else if let error = viewModel.error {
                        HCErrorCard(text: error)
                    } else if let overview = viewModel.overview {
                        if overview.usageBlocked {
                            limitBanner
                        }
                        statGrid(overview: overview)
                        usageSection(overview: overview)
                        quickActions(overview: overview)
                        activityFeed(overview: overview)
                    }
                }
                .padding(HandyCallTheme.Spacing.screenPadding)
                .padding(.bottom, HandyCallTheme.Spacing.xxl)
            }
            .background(HandyCallTheme.pageBackground.ignoresSafeArea())
            .navigationTitle("Home")
            .task {
                await viewModel.load(using: container.apiClient)
            }
            .refreshable {
                await viewModel.load(using: container.apiClient)
            }
        }
    }

    // MARK: - Greeting

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }

    // MARK: - Hero

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(greeting)
                        .font(HandyCallTheme.Typography.subhead)
                        .foregroundStyle(.white.opacity(0.85))
                    Text(sessionStore.company?.companyName ?? "HandyCall")
                        .font(HandyCallTheme.Typography.title)
                        .foregroundStyle(.white)
                }
                Spacer()
                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: 36))
                    .foregroundStyle(.white.opacity(0.12))
            }

            Text("Your business at a glance")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
        }
        .padding(HandyCallTheme.Spacing.xl)
        .background(HandyCallTheme.heroGradient, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.xl, style: .continuous))
        .elevatedShadow()
    }

    // MARK: - Limit Banner

    private var limitBanner: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(HandyCallTheme.destructive)
            VStack(alignment: .leading, spacing: 4) {
                Text("Plan limit reached")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HandyCallTheme.destructive)
                Text("AI handling may be paused until your next billing reset.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(HandyCallTheme.Spacing.md)
        .background(HandyCallTheme.destructive.opacity(0.08), in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.md, style: .continuous))
    }

    // MARK: - Stat Grid

    private func statGrid(overview: DashboardOverview) -> some View {
        let items: [(String, String, String, Color)] = [
            ("Minutes", "\(Int(overview.usageSummary.minutes.percent.rounded()))%", "clock.fill", HandyCallTheme.emeraldFixed),
            ("Leads", "\(overview.metrics.activeLeads)", "person.badge.plus", .orange),
            ("Bookings", "\(overview.metrics.appointmentsThisWeek)", "calendar.badge.clock", HandyCallTheme.info),
            ("Revenue", currency(overview.metrics.revenueThisMonthCents), "dollarsign.circle.fill", HandyCallTheme.emeraldFixed)
        ]

        return LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: item.2)
                        .font(.system(size: 18))
                        .foregroundStyle(item.3)
                        .frame(width: 34, height: 34)
                        .background(item.3.opacity(0.12), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                    Text(item.1)
                        .font(HandyCallTheme.Typography.statNumber)
                        .foregroundStyle(HandyCallTheme.slate)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)

                    Text(item.0)
                        .font(HandyCallTheme.Typography.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(HandyCallTheme.Spacing.cardPadding)
                .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
                .cardShadow()
            }
        }
    }

    // MARK: - Usage Summary

    private func usageSection(overview: DashboardOverview) -> some View {
        VStack(alignment: .leading, spacing: HandyCallTheme.Spacing.md) {
            SectionLabel(title: "Usage Summary")

            VStack(spacing: 14) {
                UsageBarRow(title: "Call minutes", item: overview.usageSummary.minutes)
                UsageBarRow(title: "SMS messages", item: overview.usageSummary.sms)
                UsageBarRow(title: "Contacts", item: overview.usageSummary.contacts)
            }
            .padding(HandyCallTheme.Spacing.cardPadding)
            .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
            .cardShadow()
        }
    }

    // MARK: - Quick Actions

    private func quickActions(overview: DashboardOverview) -> some View {
        VStack(alignment: .leading, spacing: HandyCallTheme.Spacing.md) {
            SectionLabel(title: "Quick Actions")

            if overview.quickInsights.quickActions.isEmpty {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(HandyCallTheme.emeraldFixed)
                    Text("You're all caught up.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(HandyCallTheme.Spacing.cardPadding)
                .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
                .cardShadow()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(overview.quickInsights.quickActions.enumerated()), id: \.element.id) { index, action in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(severityColor(action.severity).gradient)
                                .frame(width: 8, height: 8)

                            Text(action.title)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(HandyCallTheme.slate)
                                .lineLimit(2)

                            Spacer()

                            Text("\(action.count)")
                                .font(.caption.weight(.bold))
                                .monospacedDigit()
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(HandyCallTheme.emeraldLight, in: Capsule())
                                .foregroundStyle(HandyCallTheme.emeraldFixed)
                        }
                        .padding(.vertical, 11)
                        .padding(.horizontal, HandyCallTheme.Spacing.cardPadding)

                        if index < overview.quickInsights.quickActions.count - 1 {
                            Divider().padding(.leading, 30)
                        }
                    }
                }
                .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
                .cardShadow()
            }
        }
    }

    // MARK: - Activity Feed

    private func activityFeed(overview: DashboardOverview) -> some View {
        VStack(alignment: .leading, spacing: HandyCallTheme.Spacing.md) {
            SectionLabel(title: "Recent Activity")

            if overview.activityFeed.isEmpty {
                Text("No recent activity.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(HandyCallTheme.Spacing.cardPadding)
                    .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
                    .cardShadow()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(overview.activityFeed.prefix(12).enumerated()), id: \.element.id) { index, item in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: icon(for: item.type))
                                .font(.system(size: 14))
                                .foregroundStyle(HandyCallTheme.emeraldFixed)
                                .frame(width: 28, height: 28)
                                .background(HandyCallTheme.emeraldLight, in: Circle())

                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.title)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(HandyCallTheme.slate)
                                Text(item.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                                Text(formatTime(item.createdAt))
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }

                            Spacer()
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, HandyCallTheme.Spacing.cardPadding)

                        if index < min(11, overview.activityFeed.count - 1) {
                            Divider().padding(.leading, 52)
                        }
                    }
                }
                .background(HandyCallTheme.surfaceWhite, in: RoundedRectangle(cornerRadius: HandyCallTheme.Radius.card, style: .continuous))
                .cardShadow()
            }
        }
    }

    // MARK: - Helpers

    private func currency(_ cents: Int) -> String {
        let amount = Double(cents) / 100
        return amount.formatted(.currency(code: "USD"))
    }

    private func formatTime(_ ms: Double) -> String {
        guard ms > 0 else { return "" }
        let date = Date(timeIntervalSince1970: ms > 10_000_000_000 ? ms / 1000 : ms)
        return date.formatted(.relative(presentation: .named))
    }

    private func icon(for type: String) -> String {
        switch type.uppercased() {
        case "CALL": return "phone.fill"
        case "APPOINTMENT": return "calendar"
        case "PAYMENT": return "creditcard.fill"
        case "LEAD": return "person.badge.plus"
        case "SMS", "MESSAGE": return "message.fill"
        default: return "bell.fill"
        }
    }

    private func severityColor(_ severity: String) -> Color {
        switch severity.uppercased() {
        case "HIGH": return HandyCallTheme.destructive
        case "MEDIUM": return HandyCallTheme.warning
        default: return HandyCallTheme.info
        }
    }
}

// MARK: - Section Label

struct SectionLabel: View {
    let title: String

    var body: some View {
        Text(title)
            .font(HandyCallTheme.Typography.headline)
            .foregroundStyle(HandyCallTheme.slate)
    }
}

// MARK: - Usage Bar Row

private struct UsageBarRow: View {
    let title: String
    let item: DashboardOverview.UsageItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HandyCallTheme.slate)
                Spacer()
                Text("\(Int(item.used.rounded())) / \(Int(item.limit.rounded()))")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.secondary.opacity(0.12))
                        .frame(height: 8)
                    Capsule()
                        .fill(barColor.gradient)
                        .frame(width: max(0, min(geo.size.width, geo.size.width * (item.percent / 100))), height: 8)
                        .animation(.spring(response: 0.6), value: item.percent)
                }
            }
            .frame(height: 8)
        }
    }

    private var barColor: Color {
        if item.blocked { return HandyCallTheme.destructive }
        if item.percent >= 75 { return HandyCallTheme.warning }
        return HandyCallTheme.emeraldFixed
    }
}
