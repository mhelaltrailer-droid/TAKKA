import 'dart:convert';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/kitchen/kitchen_onboarding_copy.dart';
import '../../../core/location/obour_areas.dart';
import '../../../core/location/obour_location_picker.dart';
import '../../../core/network/mobile_upload_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../data/kitchen_management_service.dart';

class KitchenOnboardingScreen extends StatefulWidget {
  const KitchenOnboardingScreen({
    super.key,
    this.onCompleted,
    this.embeddedAsRoot = false,
  });

  /// Called after a successful submit (after the success dialog closes).
  final VoidCallback? onCompleted;

  /// When true, do not pop the onboarding route (it is the signed-in root).
  final bool embeddedAsRoot;

  @override
  State<KitchenOnboardingScreen> createState() =>
      _KitchenOnboardingScreenState();
}

class _KitchenOnboardingScreenState extends State<KitchenOnboardingScreen> {
  final _service = const KitchenManagementService();
  final _uploadService = MobileUploadService();
  final _formKey = GlobalKey<FormState>();
  final _kitchenNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _logoController = TextEditingController();
  final _coverController = TextEditingController();
  final _instapayHandleController = TextEditingController();
  final _instapayLinkController = TextEditingController();
  final _nationalIdController = TextEditingController();

  ObourLocationSelection _location = const ObourLocationSelection(
    cityName: obourCityName,
    regionName: '',
  );
  bool _isSaving = false;
  bool _isLoading = true;
  bool _showWizard = false;
  int _step = 1;
  String? _approvalStatus;
  String? _rejectionReason;
  bool _hasServerProfile = false;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _kitchenNameController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _logoController.dispose();
    _coverController.dispose();
    _instapayHandleController.dispose();
    _instapayLinkController.dispose();
    _nationalIdController.dispose();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await _service.loadProfile(sessionToken: token.jwt);

      if (!mounted) {
        return;
      }

      if (profile == null) {
        await _loadDraft();
        setState(() {
          _hasServerProfile = false;
          _showWizard = true;
          _isLoading = false;
        });
        return;
      }

      _applyProfile(profile);
      final status = profile.approvalStatus;

      setState(() {
        _hasServerProfile = true;
        _approvalStatus = status;
        _rejectionReason = profile.rejectionReason;
        // PENDING / APPROVED / REJECTED → status gate; wizard opens after
        // reject via «عدّل وأعد الإرسال», or immediately if no kitchen.
        _showWizard = false;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      await _loadDraft();
      setState(() {
        _showWizard = true;
        _isLoading = false;
      });
    }
  }

  void _applyProfile(KitchenProfileData profile) {
    _kitchenNameController.text = profile.kitchenName;
    _descriptionController.text = profile.description ?? '';
    _phoneController.text = profile.phoneNumber;
    _addressController.text = profile.addressLine;
    _logoController.text = profile.logoUrl ?? '';
    _coverController.text = profile.coverImageUrl ?? '';
    _instapayHandleController.text = profile.instapayHandle ?? '';
    _instapayLinkController.text = profile.instapayLink ?? '';
    _nationalIdController.text = profile.nationalIdImageUrl ?? '';
    _location = ObourLocationSelection(
      cityName: obourCityName,
      regionName: profile.regionName,
    );
  }

  Future<void> _loadDraft({bool mergeWithProfile = false}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(kitchenOnboardingDraftKey);
      if (raw == null || raw.isEmpty) {
        return;
      }
      final data = jsonDecode(raw) as Map<String, dynamic>;
      void apply(TextEditingController c, String key) {
        final value = data[key]?.toString();
        if (value == null) {
          return;
        }
        if (!mergeWithProfile || c.text.trim().isEmpty) {
          c.text = value;
        }
      }

      apply(_kitchenNameController, 'kitchenName');
      apply(_descriptionController, 'description');
      apply(_phoneController, 'phoneNumber');
      apply(_addressController, 'addressLine');
      apply(_logoController, 'logoUrl');
      apply(_coverController, 'coverImageUrl');
      apply(_instapayHandleController, 'instapayHandle');
      apply(_instapayLinkController, 'instapayLink');
      apply(_nationalIdController, 'nationalIdImageUrl');

      final region = data['regionName']?.toString();
      if (region != null &&
          region.isNotEmpty &&
          (!mergeWithProfile || _location.regionName.isEmpty)) {
        _location = ObourLocationSelection(
          cityName: obourCityName,
          regionName: region,
          latitude: (data['latitude'] as num?)?.toDouble() ?? _location.latitude,
          longitude:
              (data['longitude'] as num?)?.toDouble() ?? _location.longitude,
        );
      } else if (data['latitude'] != null || data['longitude'] != null) {
        _location = ObourLocationSelection(
          cityName: obourCityName,
          regionName: _location.regionName,
          latitude: (data['latitude'] as num?)?.toDouble(),
          longitude: (data['longitude'] as num?)?.toDouble(),
        );
      }

      final step = data['step'];
      if (step is int && step >= 1 && step <= 4) {
        _step = step;
      }
    } catch (_) {
      // Ignore corrupt drafts.
    }
  }

  Future<void> _saveDraft({bool showSnack = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = <String, dynamic>{
      'step': _step,
      'kitchenName': _kitchenNameController.text.trim(),
      'description': _descriptionController.text.trim(),
      'phoneNumber': _phoneController.text.trim(),
      'addressLine': _addressController.text.trim(),
      'regionName': _location.regionName,
      'latitude': _location.latitude,
      'longitude': _location.longitude,
      'logoUrl': _logoController.text.trim(),
      'coverImageUrl': _coverController.text.trim(),
      'instapayHandle': _instapayHandleController.text.trim(),
      'instapayLink': _instapayLinkController.text.trim(),
      'nationalIdImageUrl': _nationalIdController.text.trim(),
    };
    await prefs.setString(kitchenOnboardingDraftKey, jsonEncode(payload));
    if (showSnack && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم حفظ المسودة')),
      );
    }
  }

  Future<void> _clearDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(kitchenOnboardingDraftKey);
  }

  Future<void> _openWizardAfterReject() async {
    await _loadDraft(mergeWithProfile: true);
    if (!mounted) {
      return;
    }
    setState(() {
      _showWizard = true;
      _step = 1;
    });
  }

  Future<void> _goToStep(int next) async {
    await _saveDraft();
    if (!mounted) {
      return;
    }
    setState(() => _step = next.clamp(1, 4));
  }

  bool _hasValidKitchenCoords() {
    final lat = _location.latitude;
    final lng = _location.longitude;
    return lat != null &&
        lng != null &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180;
  }

  bool _validateCurrentStep() {
    if (_step == 1) {
      if (_kitchenNameController.text.trim().isEmpty ||
          _phoneController.text.trim().isEmpty ||
          _addressController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى استكمال الحقول المطلوبة')),
        );
        return false;
      }
      final locationError = assertObourLocation(
        _location.cityName,
        _location.regionName,
      );
      if (locationError != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(locationError)),
        );
        return false;
      }
      if (!_hasValidKitchenCoords()) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(kitchenCoordsRequired)),
        );
        return false;
      }
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(kitchenOnboardingScreenTitle),
      ),
      body: _isLoading
          ? const FormScreenSkeleton()
          : (!_showWizard && _hasServerProfile)
              ? _buildStatusGate()
              : Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      _buildProgress(),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.all(20),
                          children: [
                            Text(
                              kitchenOnboardingSteps[_step - 1].title,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 16),
                            if (_step == 1) ..._buildStep1(),
                            if (_step == 2) ..._buildStep2(),
                            if (_step == 3) ..._buildStep3(),
                            if (_step == 4) ..._buildStep4(),
                          ],
                        ),
                      ),
                      _buildBottomBar(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildStatusGate() {
    final status = _approvalStatus;
    if (status == 'PENDING') {
      return _statusCard(
        color: const Color(0xFFFFF8E1),
        title: kitchenStatusPending,
        body: kitchenStatusPendingBody,
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(kitchenOnboardingReturn),
          ),
        ],
      );
    }
    if (status == 'APPROVED') {
      return _statusCard(
        color: const Color(0xFFE8F5E9),
        title: kitchenStatusApproved,
        body: kitchenStatusApprovedBody,
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(kitchenOnboardingReturn),
          ),
        ],
      );
    }
    // REJECTED
    return _statusCard(
      color: const Color(0xFFFFEBEE),
      title: kitchenStatusRejected,
      body: (_rejectionReason?.isNotEmpty ?? false)
          ? 'سبب الرفض: $_rejectionReason'
          : 'تم رفض اعتماد المطبخ. عدّل البيانات وأعد الإرسال.',
      titleColor: const Color(0xFFC62828),
      actions: [
        FilledButton(
          onPressed: _openWizardAfterReject,
          child: const Text(kitchenOnboardingEditResubmit),
        ),
      ],
    );
  }

  Widget _statusCard({
    required Color color,
    required String title,
    required String body,
    required List<Widget> actions,
    Color? titleColor,
  }) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Card(
        color: color,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: titleColor ?? TakkaColors.ink,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                body,
                textAlign: TextAlign.center,
                style: const TextStyle(height: 1.6, fontSize: 15),
              ),
              const SizedBox(height: 20),
              ...actions,
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgress() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '$_step / 4',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: TakkaColors.muted,
            ),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: _step / 4,
              minHeight: 8,
              backgroundColor: TakkaColors.softLine,
              color: TakkaColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildStep1() {
    return [
      _field(_kitchenNameController, 'اسم المطبخ', required: true),
      _field(_descriptionController, 'الوصف', maxLines: 3),
      _field(_phoneController, 'رقم الهاتف', required: true),
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'موقع المطبخ (إلزامي — يظهر للعملاء على الخريطة)',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              kitchenLocationHint,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: TakkaColors.muted,
                    height: 1.5,
                  ),
            ),
            const SizedBox(height: 12),
            ObourLocationPicker(
              initialRegionName: _location.regionName,
              initialLatitude: _location.latitude,
              initialLongitude: _location.longitude,
              coordsRequired: true,
              onChanged: (selection) {
                setState(() => _location = selection);
                _saveDraft();
              },
            ),
          ],
        ),
      ),
      _field(_addressController, 'العنوان', maxLines: 2, required: true),
    ];
  }

  List<Widget> _buildStep2() {
    return [
      _imageField(
        _logoController,
        'لوجو المطبخ',
        'kitchenLogo',
        kitchenUploadCriteriaLogo,
      ),
      _imageField(
        _coverController,
        'صورة الغلاف',
        'kitchenCover',
        kitchenUploadCriteriaCover,
      ),
    ];
  }

  List<Widget> _buildStep3() {
    return [
      _field(_instapayHandleController, 'معرّف InstaPay'),
      _field(_instapayLinkController, 'رابط الدفع'),
      _imageField(
        _nationalIdController,
        'صورة البطاقة الشخصية',
        'kitchenDocument',
        kitchenUploadCriteriaNationalId,
      ),
    ];
  }

  List<Widget> _buildStep4() {
    return [
      _summaryRow('اسم المطبخ', _kitchenNameController.text),
      _summaryRow('الوصف', _descriptionController.text),
      _summaryRow('رقم الهاتف', _phoneController.text),
      _summaryRow('الحي', _location.regionName),
      _summaryRow('العنوان', _addressController.text),
      _summaryRow('اللوجو', _logoController.text),
      _summaryRow('الغلاف', _coverController.text),
      _summaryRow('معرّف InstaPay', _instapayHandleController.text),
      _summaryRow('رابط الدفع', _instapayLinkController.text),
      _summaryRow('صورة البطاقة', _nationalIdController.text),
    ];
  }

  Widget _summaryRow(String label, String value) {
    final display = value.trim().isEmpty ? '—' : value.trim();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: TakkaColors.muted,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            display,
            style: const TextStyle(height: 1.45, fontSize: 15),
          ),
          const Divider(height: 20),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OutlinedButton(
              onPressed: _isSaving ? null : () => _saveDraft(showSnack: true),
              child: const Text(kitchenOnboardingSaveDraft),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (_step > 1)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSaving
                          ? null
                          : () => _goToStep(_step - 1),
                      child: const Text(kitchenOnboardingBack),
                    ),
                  ),
                if (_step > 1) const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: _isSaving
                        ? null
                        : () async {
                            if (_step < 4) {
                              if (!_validateCurrentStep()) {
                                return;
                              }
                              await _goToStep(_step + 1);
                              return;
                            }
                            await _save();
                          },
                    child: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            _step < 4
                                ? kitchenOnboardingNext
                                : kitchenOnboardingSubmit,
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    int maxLines = 1,
    bool required = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Focus(
        onFocusChange: (hasFocus) {
          if (!hasFocus) {
            _saveDraft();
          }
        },
        child: TextFormField(
          controller: controller,
          maxLines: maxLines,
          onTapOutside: (_) => _saveDraft(),
          validator: (value) {
            if (required && (value == null || value.trim().isEmpty)) {
              return 'هذا الحقل مطلوب';
            }
            return null;
          },
          decoration: InputDecoration(labelText: label),
        ),
      ),
    );
  }

  Widget _imageField(
    TextEditingController controller,
    String label,
    String purpose,
    String criteria,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _field(controller, label),
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            criteria,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: TakkaColors.muted,
                  height: 1.5,
                ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: () => _uploadImage(controller, purpose),
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('اختيار ورفع صورة'),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final locationError = assertObourLocation(
      _location.cityName,
      _location.regionName,
    );
    if (locationError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locationError)),
      );
      return;
    }

    if (!_hasValidKitchenCoords()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(kitchenCoordsRequired)),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.saveProfile(
        sessionToken: token.jwt,
        payload: {
          'kitchenName': _kitchenNameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'phoneNumber': _phoneController.text.trim(),
          'cityName': obourCityName,
          'regionName': _location.regionName,
          'addressLine': _addressController.text.trim(),
          'latitude': _location.latitude,
          'longitude': _location.longitude,
          'logoUrl': _logoController.text.trim(),
          'coverImageUrl': _coverController.text.trim(),
          'instapayHandle': _instapayHandleController.text.trim(),
          'instapayLink': _instapayLinkController.text.trim(),
          'nationalIdImageUrl': _nationalIdController.text.trim(),
        },
      );

      await _clearDraft();

      if (!mounted) {
        return;
      }

      await _showSubmittedAndGoHome();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _showSubmittedAndGoHome() async {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return const AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(height: 8),
              Icon(
                Icons.check_circle_outline_rounded,
                color: Color(0xFF059669),
                size: 48,
              ),
              SizedBox(height: 16),
              Text(
                'تم إرسال بيانات المطبخ',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
              SizedBox(height: 12),
              Text(
                'سوف يتم مراجعة بياناتك من التطبيق',
                textAlign: TextAlign.center,
                style: TextStyle(height: 1.6),
              ),
              SizedBox(height: 10),
              Text(
                'جاري تحويلك إلى لوحة التحكم',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: TakkaColors.secondary,
                ),
              ),
              SizedBox(height: 18),
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ],
          ),
        );
      },
    );

    await Future<void>.delayed(const Duration(milliseconds: 2800));

    if (!mounted) {
      return;
    }

    try {
      final authState = ClerkAuth.of(context, listen: false);
      await authState.refreshClient();
    } catch (_) {}

    if (!mounted) {
      return;
    }

    Navigator.of(context).pop(); // close dialog
    if (!widget.embeddedAsRoot && Navigator.of(context).canPop()) {
      Navigator.of(context).pop(); // leave onboarding route
    }

    widget.onCompleted?.call();
  }

  Future<void> _uploadImage(
    TextEditingController controller,
    String purpose,
  ) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
        purpose: purpose,
      );

      if (url != null && mounted) {
        controller.text = url;
        setState(() {});
        await _saveDraft();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }
}
